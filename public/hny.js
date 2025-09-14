(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/shimmer/index.js
  var require_shimmer = __commonJS({
    "node_modules/shimmer/index.js"(exports, module) {
      "use strict";
      function isFunction2(funktion) {
        return typeof funktion === "function";
      }
      var logger3 = console.error.bind(console);
      function defineProperty3(obj, name, value) {
        var enumerable = !!obj[name] && obj.propertyIsEnumerable(name);
        Object.defineProperty(obj, name, {
          configurable: true,
          enumerable,
          writable: true,
          value
        });
      }
      function shimmer4(options) {
        if (options && options.logger) {
          if (!isFunction2(options.logger)) logger3("new logger isn't a function, not replacing");
          else logger3 = options.logger;
        }
      }
      function wrap4(nodule, name, wrapper) {
        if (!nodule || !nodule[name]) {
          logger3("no original function " + name + " to wrap");
          return;
        }
        if (!wrapper) {
          logger3("no wrapper function");
          logger3(new Error().stack);
          return;
        }
        if (!isFunction2(nodule[name]) || !isFunction2(wrapper)) {
          logger3("original object and wrapper must be functions");
          return;
        }
        var original = nodule[name];
        var wrapped = wrapper(original, name);
        defineProperty3(wrapped, "__original", original);
        defineProperty3(wrapped, "__unwrap", function() {
          if (nodule[name] === wrapped) defineProperty3(nodule, name, original);
        });
        defineProperty3(wrapped, "__wrapped", true);
        defineProperty3(nodule, name, wrapped);
        return wrapped;
      }
      function massWrap4(nodules, names, wrapper) {
        if (!nodules) {
          logger3("must provide one or more modules to patch");
          logger3(new Error().stack);
          return;
        } else if (!Array.isArray(nodules)) {
          nodules = [nodules];
        }
        if (!(names && Array.isArray(names))) {
          logger3("must provide one or more functions to wrap on modules");
          return;
        }
        nodules.forEach(function(nodule) {
          names.forEach(function(name) {
            wrap4(nodule, name, wrapper);
          });
        });
      }
      function unwrap4(nodule, name) {
        if (!nodule || !nodule[name]) {
          logger3("no function to unwrap.");
          logger3(new Error().stack);
          return;
        }
        if (!nodule[name].__unwrap) {
          logger3("no original to unwrap to -- has " + name + " already been unwrapped?");
        } else {
          return nodule[name].__unwrap();
        }
      }
      function massUnwrap4(nodules, names) {
        if (!nodules) {
          logger3("must provide one or more modules to patch");
          logger3(new Error().stack);
          return;
        } else if (!Array.isArray(nodules)) {
          nodules = [nodules];
        }
        if (!(names && Array.isArray(names))) {
          logger3("must provide one or more functions to unwrap on modules");
          return;
        }
        nodules.forEach(function(nodule) {
          names.forEach(function(name) {
            unwrap4(nodule, name);
          });
        });
      }
      shimmer4.wrap = wrap4;
      shimmer4.massWrap = massWrap4;
      shimmer4.unwrap = unwrap4;
      shimmer4.massUnwrap = massUnwrap4;
      module.exports = shimmer4;
    }
  });

  // node_modules/tracekit/tracekit.js
  var require_tracekit = __commonJS({
    "node_modules/tracekit/tracekit.js"(exports, module) {
      (function(window2, undefined2) {
        if (!window2) {
          return;
        }
        var TraceKit = {};
        var _oldTraceKit = window2.TraceKit;
        var _slice = [].slice;
        var UNKNOWN_FUNCTION = "?";
        var ERROR_TYPES_RE = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/;
        function _has(object, key) {
          return Object.prototype.hasOwnProperty.call(object, key);
        }
        function _isUndefined(what) {
          return typeof what === "undefined";
        }
        TraceKit.noConflict = function noConflict() {
          window2.TraceKit = _oldTraceKit;
          return TraceKit;
        };
        TraceKit.wrap = function traceKitWrapper(func) {
          function wrapped() {
            try {
              return func.apply(this, arguments);
            } catch (e2) {
              TraceKit.report(e2);
              throw e2;
            }
          }
          return wrapped;
        };
        TraceKit.report = function reportModuleWrapper() {
          var handlers = [], lastException = null, lastExceptionStack = null;
          function subscribe(handler) {
            installGlobalHandler();
            installGlobalUnhandledRejectionHandler();
            handlers.push(handler);
          }
          function unsubscribe(handler) {
            for (var i2 = handlers.length - 1; i2 >= 0; --i2) {
              if (handlers[i2] === handler) {
                handlers.splice(i2, 1);
              }
            }
            if (handlers.length === 0) {
              uninstallGlobalHandler();
              uninstallGlobalUnhandledRejectionHandler();
            }
          }
          function notifyHandlers(stack, isWindowError, error) {
            var exception = null;
            if (isWindowError && !TraceKit.collectWindowErrors) {
              return;
            }
            for (var i2 in handlers) {
              if (_has(handlers, i2)) {
                try {
                  handlers[i2](stack, isWindowError, error);
                } catch (inner) {
                  exception = inner;
                }
              }
            }
            if (exception) {
              throw exception;
            }
          }
          var _oldOnerrorHandler, _onErrorHandlerInstalled;
          var _oldOnunhandledrejectionHandler, _onUnhandledRejectionHandlerInstalled;
          function traceKitWindowOnError(message, url, lineNo, columnNo, errorObj) {
            var stack = null;
            if (lastExceptionStack) {
              TraceKit.computeStackTrace.augmentStackTraceWithInitialElement(lastExceptionStack, url, lineNo, message);
              processLastException();
            } else if (errorObj) {
              stack = TraceKit.computeStackTrace(errorObj);
              notifyHandlers(stack, true, errorObj);
            } else {
              var location2 = {
                "url": url,
                "line": lineNo,
                "column": columnNo
              };
              var name;
              var msg = message;
              if ({}.toString.call(message) === "[object String]") {
                var groups = message.match(ERROR_TYPES_RE);
                if (groups) {
                  name = groups[1];
                  msg = groups[2];
                }
              }
              location2.func = TraceKit.computeStackTrace.guessFunctionName(location2.url, location2.line);
              location2.context = TraceKit.computeStackTrace.gatherContext(location2.url, location2.line);
              stack = {
                "name": name,
                "message": msg,
                "mode": "onerror",
                "stack": [location2]
              };
              notifyHandlers(stack, true, null);
            }
            if (_oldOnerrorHandler) {
              return _oldOnerrorHandler.apply(this, arguments);
            }
            return false;
          }
          function traceKitWindowOnUnhandledRejection(e2) {
            var stack = TraceKit.computeStackTrace(e2.reason);
            notifyHandlers(stack, true, e2.reason);
          }
          function installGlobalHandler() {
            if (_onErrorHandlerInstalled === true) {
              return;
            }
            _oldOnerrorHandler = window2.onerror;
            window2.onerror = traceKitWindowOnError;
            _onErrorHandlerInstalled = true;
          }
          function uninstallGlobalHandler() {
            if (_onErrorHandlerInstalled) {
              window2.onerror = _oldOnerrorHandler;
              _onErrorHandlerInstalled = false;
            }
          }
          function installGlobalUnhandledRejectionHandler() {
            if (_onUnhandledRejectionHandlerInstalled === true) {
              return;
            }
            _oldOnunhandledrejectionHandler = window2.onunhandledrejection;
            window2.onunhandledrejection = traceKitWindowOnUnhandledRejection;
            _onUnhandledRejectionHandlerInstalled = true;
          }
          function uninstallGlobalUnhandledRejectionHandler() {
            if (_onUnhandledRejectionHandlerInstalled) {
              window2.onunhandledrejection = _oldOnunhandledrejectionHandler;
              _onUnhandledRejectionHandlerInstalled = false;
            }
          }
          function processLastException() {
            var _lastExceptionStack = lastExceptionStack, _lastException = lastException;
            lastExceptionStack = null;
            lastException = null;
            notifyHandlers(_lastExceptionStack, false, _lastException);
          }
          function report(ex) {
            if (lastExceptionStack) {
              if (lastException === ex) {
                return;
              } else {
                processLastException();
              }
            }
            var stack = TraceKit.computeStackTrace(ex);
            lastExceptionStack = stack;
            lastException = ex;
            setTimeout(function() {
              if (lastException === ex) {
                processLastException();
              }
            }, stack.incomplete ? 2e3 : 0);
            throw ex;
          }
          report.subscribe = subscribe;
          report.unsubscribe = unsubscribe;
          return report;
        }();
        TraceKit.computeStackTrace = function computeStackTraceWrapper() {
          var debug = false, sourceCache = {};
          function loadSource(url) {
            if (!TraceKit.remoteFetching) {
              return "";
            }
            try {
              var getXHR = function() {
                try {
                  return new window2.XMLHttpRequest();
                } catch (e2) {
                  return new window2.ActiveXObject("Microsoft.XMLHTTP");
                }
              };
              var request = getXHR();
              request.open("GET", url, false);
              request.send("");
              return request.responseText;
            } catch (e2) {
              return "";
            }
          }
          function getSource(url) {
            if (typeof url !== "string") {
              return [];
            }
            if (!_has(sourceCache, url)) {
              var source = "";
              var domain = "";
              try {
                domain = window2.document.domain;
              } catch (e2) {
              }
              var match = /(.*)\:\/\/([^:\/]+)([:\d]*)\/{0,1}([\s\S]*)/.exec(url);
              if (match && match[2] === domain) {
                source = loadSource(url);
              }
              sourceCache[url] = source ? source.split("\n") : [];
            }
            return sourceCache[url];
          }
          function guessFunctionName(url, lineNo) {
            var reFunctionArgNames = /function ([^(]*)\(([^)]*)\)/, reGuessFunction = /['"]?([0-9A-Za-z$_]+)['"]?\s*[:=]\s*(function|eval|new Function)/, line = "", maxLines = 10, source = getSource(url), m2;
            if (!source.length) {
              return UNKNOWN_FUNCTION;
            }
            for (var i2 = 0; i2 < maxLines; ++i2) {
              line = source[lineNo - i2] + line;
              if (!_isUndefined(line)) {
                if (m2 = reGuessFunction.exec(line)) {
                  return m2[1];
                } else if (m2 = reFunctionArgNames.exec(line)) {
                  return m2[1];
                }
              }
            }
            return UNKNOWN_FUNCTION;
          }
          function gatherContext(url, line) {
            var source = getSource(url);
            if (!source.length) {
              return null;
            }
            var context2 = [], linesBefore = Math.floor(TraceKit.linesOfContext / 2), linesAfter = linesBefore + TraceKit.linesOfContext % 2, start = Math.max(0, line - linesBefore - 1), end = Math.min(source.length, line + linesAfter - 1);
            line -= 1;
            for (var i2 = start; i2 < end; ++i2) {
              if (!_isUndefined(source[i2])) {
                context2.push(source[i2]);
              }
            }
            return context2.length > 0 ? context2 : null;
          }
          function escapeRegExp(text) {
            return text.replace(/[\-\[\]{}()*+?.,\\\^$|#]/g, "\\$&");
          }
          function escapeCodeAsRegExpForMatchingInsideHTML(body) {
            return escapeRegExp(body).replace("<", "(?:<|&lt;)").replace(">", "(?:>|&gt;)").replace("&", "(?:&|&amp;)").replace('"', '(?:"|&quot;)').replace(/\s+/g, "\\s+");
          }
          function findSourceInUrls(re2, urls) {
            var source, m2;
            for (var i2 = 0, j2 = urls.length; i2 < j2; ++i2) {
              if ((source = getSource(urls[i2])).length) {
                source = source.join("\n");
                if (m2 = re2.exec(source)) {
                  return {
                    "url": urls[i2],
                    "line": source.substring(0, m2.index).split("\n").length,
                    "column": m2.index - source.lastIndexOf("\n", m2.index) - 1
                  };
                }
              }
            }
            return null;
          }
          function findSourceInLine(fragment, url, line) {
            var source = getSource(url), re2 = new RegExp("\\b" + escapeRegExp(fragment) + "\\b"), m2;
            line -= 1;
            if (source && source.length > line && (m2 = re2.exec(source[line]))) {
              return m2.index;
            }
            return null;
          }
          function findSourceByFunctionBody(func) {
            if (_isUndefined(window2 && window2.document)) {
              return;
            }
            var urls = [window2.location.href], scripts = window2.document.getElementsByTagName("script"), body, code = "" + func, codeRE = /^function(?:\s+([\w$]+))?\s*\(([\w\s,]*)\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/, eventRE = /^function on([\w$]+)\s*\(event\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/, re2, parts, result;
            for (var i2 = 0; i2 < scripts.length; ++i2) {
              var script = scripts[i2];
              if (script.src) {
                urls.push(script.src);
              }
            }
            if (!(parts = codeRE.exec(code))) {
              re2 = new RegExp(escapeRegExp(code).replace(/\s+/g, "\\s+"));
            } else {
              var name = parts[1] ? "\\s+" + parts[1] : "", args = parts[2].split(",").join("\\s*,\\s*");
              body = escapeRegExp(parts[3]).replace(/;$/, ";?");
              re2 = new RegExp("function" + name + "\\s*\\(\\s*" + args + "\\s*\\)\\s*{\\s*" + body + "\\s*}");
            }
            if (result = findSourceInUrls(re2, urls)) {
              return result;
            }
            if (parts = eventRE.exec(code)) {
              var event = parts[1];
              body = escapeCodeAsRegExpForMatchingInsideHTML(parts[2]);
              re2 = new RegExp("on" + event + `=[\\'"]\\s*` + body + `\\s*[\\'"]`, "i");
              if (result = findSourceInUrls(re2, urls[0])) {
                return result;
              }
              re2 = new RegExp(body);
              if (result = findSourceInUrls(re2, urls)) {
                return result;
              }
            }
            return null;
          }
          function computeStackTraceFromStackProp(ex) {
            if (!ex.stack) {
              return null;
            }
            var chrome = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|<anonymous>|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i, gecko = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i, winjs = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i, isEval, geckoEval = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i, chromeEval = /\((\S*)(?::(\d+))(?::(\d+))\)/, lines = ex.stack.split("\n"), stack = [], submatch, parts, element, reference = /^(.*) is undefined$/.exec(ex.message);
            for (var i2 = 0, j2 = lines.length; i2 < j2; ++i2) {
              if (parts = chrome.exec(lines[i2])) {
                var isNative = parts[2] && parts[2].indexOf("native") === 0;
                isEval = parts[2] && parts[2].indexOf("eval") === 0;
                if (isEval && (submatch = chromeEval.exec(parts[2]))) {
                  parts[2] = submatch[1];
                  parts[3] = submatch[2];
                  parts[4] = submatch[3];
                }
                element = {
                  "url": !isNative ? parts[2] : null,
                  "func": parts[1] || UNKNOWN_FUNCTION,
                  "args": isNative ? [parts[2]] : [],
                  "line": parts[3] ? +parts[3] : null,
                  "column": parts[4] ? +parts[4] : null
                };
              } else if (parts = winjs.exec(lines[i2])) {
                element = {
                  "url": parts[2],
                  "func": parts[1] || UNKNOWN_FUNCTION,
                  "args": [],
                  "line": +parts[3],
                  "column": parts[4] ? +parts[4] : null
                };
              } else if (parts = gecko.exec(lines[i2])) {
                isEval = parts[3] && parts[3].indexOf(" > eval") > -1;
                if (isEval && (submatch = geckoEval.exec(parts[3]))) {
                  parts[3] = submatch[1];
                  parts[4] = submatch[2];
                  parts[5] = null;
                } else if (i2 === 0 && !parts[5] && !_isUndefined(ex.columnNumber)) {
                  stack[0].column = ex.columnNumber + 1;
                }
                element = {
                  "url": parts[3],
                  "func": parts[1] || UNKNOWN_FUNCTION,
                  "args": parts[2] ? parts[2].split(",") : [],
                  "line": parts[4] ? +parts[4] : null,
                  "column": parts[5] ? +parts[5] : null
                };
              } else {
                continue;
              }
              if (!element.func && element.line) {
                element.func = guessFunctionName(element.url, element.line);
              }
              element.context = element.line ? gatherContext(element.url, element.line) : null;
              stack.push(element);
            }
            if (!stack.length) {
              return null;
            }
            if (stack[0] && stack[0].line && !stack[0].column && reference) {
              stack[0].column = findSourceInLine(reference[1], stack[0].url, stack[0].line);
            }
            return {
              "mode": "stack",
              "name": ex.name,
              "message": ex.message,
              "stack": stack
            };
          }
          function computeStackTraceFromStacktraceProp(ex) {
            var stacktrace = ex.stacktrace;
            if (!stacktrace) {
              return;
            }
            var opera10Regex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i, opera11Regex = / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^\)]+))\((.*)\))? in (.*):\s*$/i, lines = stacktrace.split("\n"), stack = [], parts;
            for (var line = 0; line < lines.length; line += 2) {
              var element = null;
              if (parts = opera10Regex.exec(lines[line])) {
                element = {
                  "url": parts[2],
                  "line": +parts[1],
                  "column": null,
                  "func": parts[3],
                  "args": []
                };
              } else if (parts = opera11Regex.exec(lines[line])) {
                element = {
                  "url": parts[6],
                  "line": +parts[1],
                  "column": +parts[2],
                  "func": parts[3] || parts[4],
                  "args": parts[5] ? parts[5].split(",") : []
                };
              }
              if (element) {
                if (!element.func && element.line) {
                  element.func = guessFunctionName(element.url, element.line);
                }
                if (element.line) {
                  try {
                    element.context = gatherContext(element.url, element.line);
                  } catch (exc) {
                  }
                }
                if (!element.context) {
                  element.context = [lines[line + 1]];
                }
                stack.push(element);
              }
            }
            if (!stack.length) {
              return null;
            }
            return {
              "mode": "stacktrace",
              "name": ex.name,
              "message": ex.message,
              "stack": stack
            };
          }
          function computeStackTraceFromOperaMultiLineMessage(ex) {
            var lines = ex.message.split("\n");
            if (lines.length < 4) {
              return null;
            }
            var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|https?|blob)\S+)(?:: in function (\S+))?\s*$/i, lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|https?|blob)\S+)(?:: in function (\S+))?\s*$/i, lineRE3 = /^\s*Line (\d+) of function script\s*$/i, stack = [], scripts = window2 && window2.document && window2.document.getElementsByTagName("script"), inlineScriptBlocks = [], parts;
            for (var s2 in scripts) {
              if (_has(scripts, s2) && !scripts[s2].src) {
                inlineScriptBlocks.push(scripts[s2]);
              }
            }
            for (var line = 2; line < lines.length; line += 2) {
              var item = null;
              if (parts = lineRE1.exec(lines[line])) {
                item = {
                  "url": parts[2],
                  "func": parts[3],
                  "args": [],
                  "line": +parts[1],
                  "column": null
                };
              } else if (parts = lineRE2.exec(lines[line])) {
                item = {
                  "url": parts[3],
                  "func": parts[4],
                  "args": [],
                  "line": +parts[1],
                  "column": null
                  // TODO: Check to see if inline#1 (+parts[2]) points to the script number or column number.
                };
                var relativeLine = +parts[1];
                var script = inlineScriptBlocks[parts[2] - 1];
                if (script) {
                  var source = getSource(item.url);
                  if (source) {
                    source = source.join("\n");
                    var pos = source.indexOf(script.innerText);
                    if (pos >= 0) {
                      item.line = relativeLine + source.substring(0, pos).split("\n").length;
                    }
                  }
                }
              } else if (parts = lineRE3.exec(lines[line])) {
                var url = window2.location.href.replace(/#.*$/, "");
                var re2 = new RegExp(escapeCodeAsRegExpForMatchingInsideHTML(lines[line + 1]));
                var src = findSourceInUrls(re2, [url]);
                item = {
                  "url": url,
                  "func": "",
                  "args": [],
                  "line": src ? src.line : parts[1],
                  "column": null
                };
              }
              if (item) {
                if (!item.func) {
                  item.func = guessFunctionName(item.url, item.line);
                }
                var context2 = gatherContext(item.url, item.line);
                var midline = context2 ? context2[Math.floor(context2.length / 2)] : null;
                if (context2 && midline.replace(/^\s*/, "") === lines[line + 1].replace(/^\s*/, "")) {
                  item.context = context2;
                } else {
                  item.context = [lines[line + 1]];
                }
                stack.push(item);
              }
            }
            if (!stack.length) {
              return null;
            }
            return {
              "mode": "multiline",
              "name": ex.name,
              "message": lines[0],
              "stack": stack
            };
          }
          function augmentStackTraceWithInitialElement(stackInfo, url, lineNo, message) {
            var initial = {
              "url": url,
              "line": lineNo
            };
            if (initial.url && initial.line) {
              stackInfo.incomplete = false;
              if (!initial.func) {
                initial.func = guessFunctionName(initial.url, initial.line);
              }
              if (!initial.context) {
                initial.context = gatherContext(initial.url, initial.line);
              }
              var reference = / '([^']+)' /.exec(message);
              if (reference) {
                initial.column = findSourceInLine(reference[1], initial.url, initial.line);
              }
              if (stackInfo.stack.length > 0) {
                if (stackInfo.stack[0].url === initial.url) {
                  if (stackInfo.stack[0].line === initial.line) {
                    return false;
                  } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func === initial.func) {
                    stackInfo.stack[0].line = initial.line;
                    stackInfo.stack[0].context = initial.context;
                    return false;
                  }
                }
              }
              stackInfo.stack.unshift(initial);
              stackInfo.partial = true;
              return true;
            } else {
              stackInfo.incomplete = true;
            }
            return false;
          }
          function computeStackTraceByWalkingCallerChain(ex, depth) {
            var functionName = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i, stack = [], funcs = {}, recursion = false, parts, item, source;
            for (var curr = computeStackTraceByWalkingCallerChain.caller; curr && !recursion; curr = curr.caller) {
              if (curr === computeStackTrace2 || curr === TraceKit.report) {
                continue;
              }
              item = {
                "url": null,
                "func": UNKNOWN_FUNCTION,
                "args": [],
                "line": null,
                "column": null
              };
              if (curr.name) {
                item.func = curr.name;
              } else if (parts = functionName.exec(curr.toString())) {
                item.func = parts[1];
              }
              if (typeof item.func === "undefined") {
                try {
                  item.func = parts.input.substring(0, parts.input.indexOf("{"));
                } catch (e2) {
                }
              }
              if (source = findSourceByFunctionBody(curr)) {
                item.url = source.url;
                item.line = source.line;
                if (item.func === UNKNOWN_FUNCTION) {
                  item.func = guessFunctionName(item.url, item.line);
                }
                var reference = / '([^']+)' /.exec(ex.message || ex.description);
                if (reference) {
                  item.column = findSourceInLine(reference[1], source.url, source.line);
                }
              }
              if (funcs["" + curr]) {
                recursion = true;
              } else {
                funcs["" + curr] = true;
              }
              stack.push(item);
            }
            if (depth) {
              stack.splice(0, depth);
            }
            var result = {
              "mode": "callers",
              "name": ex.name,
              "message": ex.message,
              "stack": stack
            };
            augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber, ex.message || ex.description);
            return result;
          }
          function computeStackTrace2(ex, depth) {
            var stack = null;
            depth = depth == null ? 0 : +depth;
            try {
              stack = computeStackTraceFromStacktraceProp(ex);
              if (stack) {
                return stack;
              }
            } catch (e2) {
              if (debug) {
                throw e2;
              }
            }
            try {
              stack = computeStackTraceFromStackProp(ex);
              if (stack) {
                return stack;
              }
            } catch (e2) {
              if (debug) {
                throw e2;
              }
            }
            try {
              stack = computeStackTraceFromOperaMultiLineMessage(ex);
              if (stack) {
                return stack;
              }
            } catch (e2) {
              if (debug) {
                throw e2;
              }
            }
            try {
              stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
              if (stack) {
                return stack;
              }
            } catch (e2) {
              if (debug) {
                throw e2;
              }
            }
            return {
              "name": ex.name,
              "message": ex.message,
              "mode": "failed"
            };
          }
          function computeStackTraceOfCaller(depth) {
            depth = (depth == null ? 0 : +depth) + 1;
            try {
              throw new Error();
            } catch (ex) {
              return computeStackTrace2(ex, depth + 1);
            }
          }
          computeStackTrace2.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
          computeStackTrace2.computeStackTraceFromStackProp = computeStackTraceFromStackProp;
          computeStackTrace2.guessFunctionName = guessFunctionName;
          computeStackTrace2.gatherContext = gatherContext;
          computeStackTrace2.ofCaller = computeStackTraceOfCaller;
          computeStackTrace2.getSource = getSource;
          return computeStackTrace2;
        }();
        TraceKit.extendToAsynchronousCallbacks = function() {
          var _helper = function _helper2(fnName) {
            var originalFn = window2[fnName];
            window2[fnName] = function traceKitAsyncExtension() {
              var args = _slice.call(arguments);
              var originalCallback = args[0];
              if (typeof originalCallback === "function") {
                args[0] = TraceKit.wrap(originalCallback);
              }
              if (originalFn.apply) {
                return originalFn.apply(this, args);
              } else {
                return originalFn(args[0], args[1]);
              }
            };
          };
          _helper("setTimeout");
          _helper("setInterval");
        };
        if (!TraceKit.remoteFetching) {
          TraceKit.remoteFetching = true;
        }
        if (!TraceKit.collectWindowErrors) {
          TraceKit.collectWindowErrors = true;
        }
        if (!TraceKit.linesOfContext || TraceKit.linesOfContext < 1) {
          TraceKit.linesOfContext = 11;
        }
        if (typeof define === "function" && define.amd) {
          define("TraceKit", [], TraceKit);
        } else if (typeof module !== "undefined" && module.exports && window2.module !== module) {
          module.exports = TraceKit;
        } else {
          window2.TraceKit = TraceKit;
        }
      })(typeof window !== "undefined" ? window : global);
    }
  });

  // node_modules/ua-parser-js/src/ua-parser.js
  var require_ua_parser = __commonJS({
    "node_modules/ua-parser-js/src/ua-parser.js"(exports, module) {
      (function(window2, undefined2) {
        "use strict";
        var LIBVERSION = "1.0.39", EMPTY = "", UNKNOWN = "?", FUNC_TYPE = "function", UNDEF_TYPE = "undefined", OBJ_TYPE = "object", STR_TYPE = "string", MAJOR = "major", MODEL = "model", NAME = "name", TYPE = "type", VENDOR = "vendor", VERSION7 = "version", ARCHITECTURE = "architecture", CONSOLE = "console", MOBILE = "mobile", TABLET = "tablet", SMARTTV = "smarttv", WEARABLE = "wearable", EMBEDDED = "embedded", UA_MAX_LENGTH = 500;
        var AMAZON = "Amazon", APPLE = "Apple", ASUS = "ASUS", BLACKBERRY = "BlackBerry", BROWSER = "Browser", CHROME = "Chrome", EDGE = "Edge", FIREFOX = "Firefox", GOOGLE = "Google", HUAWEI = "Huawei", LG = "LG", MICROSOFT = "Microsoft", MOTOROLA = "Motorola", OPERA = "Opera", SAMSUNG = "Samsung", SHARP = "Sharp", SONY = "Sony", XIAOMI = "Xiaomi", ZEBRA = "Zebra", FACEBOOK = "Facebook", CHROMIUM_OS = "Chromium OS", MAC_OS = "Mac OS", SUFFIX_BROWSER = " Browser";
        var extend = function(regexes2, extensions) {
          var mergedRegexes = {};
          for (var i2 in regexes2) {
            if (extensions[i2] && extensions[i2].length % 2 === 0) {
              mergedRegexes[i2] = extensions[i2].concat(regexes2[i2]);
            } else {
              mergedRegexes[i2] = regexes2[i2];
            }
          }
          return mergedRegexes;
        }, enumerize = function(arr) {
          var enums = {};
          for (var i2 = 0; i2 < arr.length; i2++) {
            enums[arr[i2].toUpperCase()] = arr[i2];
          }
          return enums;
        }, has = function(str1, str2) {
          return typeof str1 === STR_TYPE ? lowerize(str2).indexOf(lowerize(str1)) !== -1 : false;
        }, lowerize = function(str) {
          return str.toLowerCase();
        }, majorize = function(version) {
          return typeof version === STR_TYPE ? version.replace(/[^\d\.]/g, EMPTY).split(".")[0] : undefined2;
        }, trim = function(str, len) {
          if (typeof str === STR_TYPE) {
            str = str.replace(/^\s\s*/, EMPTY);
            return typeof len === UNDEF_TYPE ? str : str.substring(0, UA_MAX_LENGTH);
          }
        };
        var rgxMapper = function(ua, arrays) {
          var i2 = 0, j2, k2, p2, q2, matches, match;
          while (i2 < arrays.length && !matches) {
            var regex = arrays[i2], props = arrays[i2 + 1];
            j2 = k2 = 0;
            while (j2 < regex.length && !matches) {
              if (!regex[j2]) {
                break;
              }
              matches = regex[j2++].exec(ua);
              if (!!matches) {
                for (p2 = 0; p2 < props.length; p2++) {
                  match = matches[++k2];
                  q2 = props[p2];
                  if (typeof q2 === OBJ_TYPE && q2.length > 0) {
                    if (q2.length === 2) {
                      if (typeof q2[1] == FUNC_TYPE) {
                        this[q2[0]] = q2[1].call(this, match);
                      } else {
                        this[q2[0]] = q2[1];
                      }
                    } else if (q2.length === 3) {
                      if (typeof q2[1] === FUNC_TYPE && !(q2[1].exec && q2[1].test)) {
                        this[q2[0]] = match ? q2[1].call(this, match, q2[2]) : undefined2;
                      } else {
                        this[q2[0]] = match ? match.replace(q2[1], q2[2]) : undefined2;
                      }
                    } else if (q2.length === 4) {
                      this[q2[0]] = match ? q2[3].call(this, match.replace(q2[1], q2[2])) : undefined2;
                    }
                  } else {
                    this[q2] = match ? match : undefined2;
                  }
                }
              }
            }
            i2 += 2;
          }
        }, strMapper = function(str, map) {
          for (var i2 in map) {
            if (typeof map[i2] === OBJ_TYPE && map[i2].length > 0) {
              for (var j2 = 0; j2 < map[i2].length; j2++) {
                if (has(map[i2][j2], str)) {
                  return i2 === UNKNOWN ? undefined2 : i2;
                }
              }
            } else if (has(map[i2], str)) {
              return i2 === UNKNOWN ? undefined2 : i2;
            }
          }
          return map.hasOwnProperty("*") ? map["*"] : str;
        };
        var oldSafariMap = {
          "1.0": "/8",
          "1.2": "/1",
          "1.3": "/3",
          "2.0": "/412",
          "2.0.2": "/416",
          "2.0.3": "/417",
          "2.0.4": "/419",
          "?": "/"
        }, windowsVersionMap = {
          "ME": "4.90",
          "NT 3.11": "NT3.51",
          "NT 4.0": "NT4.0",
          "2000": "NT 5.0",
          "XP": ["NT 5.1", "NT 5.2"],
          "Vista": "NT 6.0",
          "7": "NT 6.1",
          "8": "NT 6.2",
          "8.1": "NT 6.3",
          "10": ["NT 6.4", "NT 10.0"],
          "RT": "ARM"
        };
        var regexes = {
          browser: [
            [
              /\b(?:crmo|crios)\/([\w\.]+)/i
              // Chrome for Android/iOS
            ],
            [VERSION7, [NAME, "Chrome"]],
            [
              /edg(?:e|ios|a)?\/([\w\.]+)/i
              // Microsoft Edge
            ],
            [VERSION7, [NAME, "Edge"]],
            [
              // Presto based
              /(opera mini)\/([-\w\.]+)/i,
              // Opera Mini
              /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,
              // Opera Mobi/Tablet
              /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i
              // Opera
            ],
            [NAME, VERSION7],
            [
              /opios[\/ ]+([\w\.]+)/i
              // Opera mini on iphone >= 8.0
            ],
            [VERSION7, [NAME, OPERA + " Mini"]],
            [
              /\bop(?:rg)?x\/([\w\.]+)/i
              // Opera GX
            ],
            [VERSION7, [NAME, OPERA + " GX"]],
            [
              /\bopr\/([\w\.]+)/i
              // Opera Webkit
            ],
            [VERSION7, [NAME, OPERA]],
            [
              // Mixed
              /\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i
              // Baidu
            ],
            [VERSION7, [NAME, "Baidu"]],
            [
              /(kindle)\/([\w\.]+)/i,
              // Kindle
              /(lunascape|maxthon|netfront|jasmine|blazer|sleipnir)[\/ ]?([\w\.]*)/i,
              // Lunascape/Maxthon/Netfront/Jasmine/Blazer/Sleipnir
              // Trident based
              /(avant|iemobile|slim)\s?(?:browser)?[\/ ]?([\w\.]*)/i,
              // Avant/IEMobile/SlimBrowser
              /(?:ms|\()(ie) ([\w\.]+)/i,
              // Internet Explorer
              // Webkit/KHTML based                                               // Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
              /(flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|duckduckgo|klar|helio)\/([-\w\.]+)/i,
              // Rekonq/Puffin/Brave/Whale/QQBrowserLite/QQ//Vivaldi/DuckDuckGo/Klar/Helio
              /(heytap|ovi)browser\/([\d\.]+)/i,
              // HeyTap/Ovi
              /(weibo)__([\d\.]+)/i
              // Weibo
            ],
            [NAME, VERSION7],
            [
              /quark(?:pc)?\/([-\w\.]+)/i
              // Quark
            ],
            [VERSION7, [NAME, "Quark"]],
            [
              /\bddg\/([\w\.]+)/i
              // DuckDuckGo
            ],
            [VERSION7, [NAME, "DuckDuckGo"]],
            [
              /(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i
              // UCBrowser
            ],
            [VERSION7, [NAME, "UC" + BROWSER]],
            [
              /microm.+\bqbcore\/([\w\.]+)/i,
              // WeChat Desktop for Windows Built-in Browser
              /\bqbcore\/([\w\.]+).+microm/i,
              /micromessenger\/([\w\.]+)/i
              // WeChat
            ],
            [VERSION7, [NAME, "WeChat"]],
            [
              /konqueror\/([\w\.]+)/i
              // Konqueror
            ],
            [VERSION7, [NAME, "Konqueror"]],
            [
              /trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i
              // IE11
            ],
            [VERSION7, [NAME, "IE"]],
            [
              /ya(?:search)?browser\/([\w\.]+)/i
              // Yandex
            ],
            [VERSION7, [NAME, "Yandex"]],
            [
              /slbrowser\/([\w\.]+)/i
              // Smart Lenovo Browser
            ],
            [VERSION7, [NAME, "Smart Lenovo " + BROWSER]],
            [
              /(avast|avg)\/([\w\.]+)/i
              // Avast/AVG Secure Browser
            ],
            [[NAME, /(.+)/, "$1 Secure " + BROWSER], VERSION7],
            [
              /\bfocus\/([\w\.]+)/i
              // Firefox Focus
            ],
            [VERSION7, [NAME, FIREFOX + " Focus"]],
            [
              /\bopt\/([\w\.]+)/i
              // Opera Touch
            ],
            [VERSION7, [NAME, OPERA + " Touch"]],
            [
              /coc_coc\w+\/([\w\.]+)/i
              // Coc Coc Browser
            ],
            [VERSION7, [NAME, "Coc Coc"]],
            [
              /dolfin\/([\w\.]+)/i
              // Dolphin
            ],
            [VERSION7, [NAME, "Dolphin"]],
            [
              /coast\/([\w\.]+)/i
              // Opera Coast
            ],
            [VERSION7, [NAME, OPERA + " Coast"]],
            [
              /miuibrowser\/([\w\.]+)/i
              // MIUI Browser
            ],
            [VERSION7, [NAME, "MIUI " + BROWSER]],
            [
              /fxios\/([-\w\.]+)/i
              // Firefox for iOS
            ],
            [VERSION7, [NAME, FIREFOX]],
            [
              /\bqihu|(qi?ho?o?|360)browser/i
              // 360
            ],
            [[NAME, "360" + SUFFIX_BROWSER]],
            [
              /\b(qq)\/([\w\.]+)/i
              // QQ
            ],
            [[NAME, /(.+)/, "$1Browser"], VERSION7],
            [
              /(oculus|sailfish|huawei|vivo|pico)browser\/([\w\.]+)/i
            ],
            [[NAME, /(.+)/, "$1" + SUFFIX_BROWSER], VERSION7],
            [
              // Oculus/Sailfish/HuaweiBrowser/VivoBrowser/PicoBrowser
              /samsungbrowser\/([\w\.]+)/i
              // Samsung Internet
            ],
            [VERSION7, [NAME, SAMSUNG + " Internet"]],
            [
              /(comodo_dragon)\/([\w\.]+)/i
              // Comodo Dragon
            ],
            [[NAME, /_/g, " "], VERSION7],
            [
              /metasr[\/ ]?([\d\.]+)/i
              // Sogou Explorer
            ],
            [VERSION7, [NAME, "Sogou Explorer"]],
            [
              /(sogou)mo\w+\/([\d\.]+)/i
              // Sogou Mobile
            ],
            [[NAME, "Sogou Mobile"], VERSION7],
            [
              /(electron)\/([\w\.]+) safari/i,
              // Electron-based App
              /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,
              // Tesla
              /m?(qqbrowser|2345Explorer)[\/ ]?([\w\.]+)/i
              // QQBrowser/2345 Browser
            ],
            [NAME, VERSION7],
            [
              /(lbbrowser|rekonq)/i,
              // LieBao Browser/Rekonq
              /\[(linkedin)app\]/i
              // LinkedIn App for iOS & Android
            ],
            [NAME],
            [
              // WebView
              /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i
              // Facebook App for iOS & Android
            ],
            [[NAME, FACEBOOK], VERSION7],
            [
              /(Klarna)\/([\w\.]+)/i,
              // Klarna Shopping Browser for iOS & Android
              /(kakao(?:talk|story))[\/ ]([\w\.]+)/i,
              // Kakao App
              /(naver)\(.*?(\d+\.[\w\.]+).*\)/i,
              // Naver InApp
              /safari (line)\/([\w\.]+)/i,
              // Line App for iOS
              /\b(line)\/([\w\.]+)\/iab/i,
              // Line App for Android
              /(alipay)client\/([\w\.]+)/i,
              // Alipay
              /(twitter)(?:and| f.+e\/([\w\.]+))/i,
              // Twitter
              /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i
              // Chromium/Instagram/Snapchat
            ],
            [NAME, VERSION7],
            [
              /\bgsa\/([\w\.]+) .*safari\//i
              // Google Search Appliance on iOS
            ],
            [VERSION7, [NAME, "GSA"]],
            [
              /musical_ly(?:.+app_?version\/|_)([\w\.]+)/i
              // TikTok
            ],
            [VERSION7, [NAME, "TikTok"]],
            [
              /headlesschrome(?:\/([\w\.]+)| )/i
              // Chrome Headless
            ],
            [VERSION7, [NAME, CHROME + " Headless"]],
            [
              / wv\).+(chrome)\/([\w\.]+)/i
              // Chrome WebView
            ],
            [[NAME, CHROME + " WebView"], VERSION7],
            [
              /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i
              // Android Browser
            ],
            [VERSION7, [NAME, "Android " + BROWSER]],
            [
              /(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i
              // Chrome/OmniWeb/Arora/Tizen/Nokia
            ],
            [NAME, VERSION7],
            [
              /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i
              // Mobile Safari
            ],
            [VERSION7, [NAME, "Mobile Safari"]],
            [
              /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i
              // Safari & Safari Mobile
            ],
            [VERSION7, NAME],
            [
              /webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i
              // Safari < 3.0
            ],
            [NAME, [VERSION7, strMapper, oldSafariMap]],
            [
              /(webkit|khtml)\/([\w\.]+)/i
            ],
            [NAME, VERSION7],
            [
              // Gecko based
              /(navigator|netscape\d?)\/([-\w\.]+)/i
              // Netscape
            ],
            [[NAME, "Netscape"], VERSION7],
            [
              /(wolvic)\/([\w\.]+)/i
              // Wolvic
            ],
            [NAME, VERSION7],
            [
              /mobile vr; rv:([\w\.]+)\).+firefox/i
              // Firefox Reality
            ],
            [VERSION7, [NAME, FIREFOX + " Reality"]],
            [
              /ekiohf.+(flow)\/([\w\.]+)/i,
              // Flow
              /(swiftfox)/i,
              // Swiftfox
              /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror)[\/ ]?([\w\.\+]+)/i,
              // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
              /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
              // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
              /(firefox)\/([\w\.]+)/i,
              // Other Firefox-based
              /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,
              // Mozilla
              // Other
              /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
              // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Obigo/Mosaic/Go/ICE/UP.Browser
              /(links) \(([\w\.]+)/i
              // Links
            ],
            [NAME, [VERSION7, /_/g, "."]],
            [
              /(cobalt)\/([\w\.]+)/i
              // Cobalt
            ],
            [NAME, [VERSION7, /master.|lts./, ""]]
          ],
          cpu: [
            [
              /(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i
              // AMD64 (x64)
            ],
            [[ARCHITECTURE, "amd64"]],
            [
              /(ia32(?=;))/i
              // IA32 (quicktime)
            ],
            [[ARCHITECTURE, lowerize]],
            [
              /((?:i[346]|x)86)[;\)]/i
              // IA32 (x86)
            ],
            [[ARCHITECTURE, "ia32"]],
            [
              /\b(aarch64|arm(v?8e?l?|_?64))\b/i
              // ARM64
            ],
            [[ARCHITECTURE, "arm64"]],
            [
              /\b(arm(?:v[67])?ht?n?[fl]p?)\b/i
              // ARMHF
            ],
            [[ARCHITECTURE, "armhf"]],
            [
              // PocketPC mistakenly identified as PowerPC
              /windows (ce|mobile); ppc;/i
            ],
            [[ARCHITECTURE, "arm"]],
            [
              /((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i
              // PowerPC
            ],
            [[ARCHITECTURE, /ower/, EMPTY, lowerize]],
            [
              /(sun4\w)[;\)]/i
              // SPARC
            ],
            [[ARCHITECTURE, "sparc"]],
            [
              /((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i
              // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ],
            [[ARCHITECTURE, lowerize]]
          ],
          device: [
            [
              //////////////////////////
              // MOBILES & TABLETS
              /////////////////////////
              // Samsung
              /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i
            ],
            [MODEL, [VENDOR, SAMSUNG], [TYPE, TABLET]],
            [
              /\b((?:s[cgp]h|gt|sm)-(?![lr])\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
              /samsung[- ]((?!sm-[lr])[-\w]+)/i,
              /sec-(sgh\w+)/i
            ],
            [MODEL, [VENDOR, SAMSUNG], [TYPE, MOBILE]],
            [
              // Apple
              /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i
              // iPod/iPhone
            ],
            [MODEL, [VENDOR, APPLE], [TYPE, MOBILE]],
            [
              /\((ipad);[-\w\),; ]+apple/i,
              // iPad
              /applecoremedia\/[\w\.]+ \((ipad)/i,
              /\b(ipad)\d\d?,\d\d?[;\]].+ios/i
            ],
            [MODEL, [VENDOR, APPLE], [TYPE, TABLET]],
            [
              /(macintosh);/i
            ],
            [MODEL, [VENDOR, APPLE]],
            [
              // Sharp
              /\b(sh-?[altvz]?\d\d[a-ekm]?)/i
            ],
            [MODEL, [VENDOR, SHARP], [TYPE, MOBILE]],
            [
              // Huawei
              /\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i
            ],
            [MODEL, [VENDOR, HUAWEI], [TYPE, TABLET]],
            [
              /(?:huawei|honor)([-\w ]+)[;\)]/i,
              /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i
            ],
            [MODEL, [VENDOR, HUAWEI], [TYPE, MOBILE]],
            [
              // Xiaomi
              /\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i,
              // Xiaomi POCO
              /\b; (\w+) build\/hm\1/i,
              // Xiaomi Hongmi 'numeric' models
              /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,
              // Xiaomi Hongmi
              /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,
              // Xiaomi Redmi
              /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i,
              // Xiaomi Redmi 'numeric' models
              /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite|pro)?)(?: bui|\))/i
              // Xiaomi Mi
            ],
            [[MODEL, /_/g, " "], [VENDOR, XIAOMI], [TYPE, MOBILE]],
            [
              /oid[^\)]+; (2\d{4}(283|rpbf)[cgl])( bui|\))/i,
              // Redmi Pad
              /\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i
              // Mi Pad tablets
            ],
            [[MODEL, /_/g, " "], [VENDOR, XIAOMI], [TYPE, TABLET]],
            [
              // OPPO
              /; (\w+) bui.+ oppo/i,
              /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i
            ],
            [MODEL, [VENDOR, "OPPO"], [TYPE, MOBILE]],
            [
              /\b(opd2\d{3}a?) bui/i
            ],
            [MODEL, [VENDOR, "OPPO"], [TYPE, TABLET]],
            [
              // Vivo
              /vivo (\w+)(?: bui|\))/i,
              /\b(v[12]\d{3}\w?[at])(?: bui|;)/i
            ],
            [MODEL, [VENDOR, "Vivo"], [TYPE, MOBILE]],
            [
              // Realme
              /\b(rmx[1-3]\d{3})(?: bui|;|\))/i
            ],
            [MODEL, [VENDOR, "Realme"], [TYPE, MOBILE]],
            [
              // Motorola
              /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
              /\bmot(?:orola)?[- ](\w*)/i,
              /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i
            ],
            [MODEL, [VENDOR, MOTOROLA], [TYPE, MOBILE]],
            [
              /\b(mz60\d|xoom[2 ]{0,2}) build\//i
            ],
            [MODEL, [VENDOR, MOTOROLA], [TYPE, TABLET]],
            [
              // LG
              /((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i
            ],
            [MODEL, [VENDOR, LG], [TYPE, TABLET]],
            [
              /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
              /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i,
              /\blg-?([\d\w]+) bui/i
            ],
            [MODEL, [VENDOR, LG], [TYPE, MOBILE]],
            [
              // Lenovo
              /(ideatab[-\w ]+)/i,
              /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i
            ],
            [MODEL, [VENDOR, "Lenovo"], [TYPE, TABLET]],
            [
              // Nokia
              /(?:maemo|nokia).*(n900|lumia \d+)/i,
              /nokia[-_ ]?([-\w\.]*)/i
            ],
            [[MODEL, /_/g, " "], [VENDOR, "Nokia"], [TYPE, MOBILE]],
            [
              // Google
              /(pixel c)\b/i
              // Google Pixel C
            ],
            [MODEL, [VENDOR, GOOGLE], [TYPE, TABLET]],
            [
              /droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i
              // Google Pixel
            ],
            [MODEL, [VENDOR, GOOGLE], [TYPE, MOBILE]],
            [
              // Sony
              /droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i
            ],
            [MODEL, [VENDOR, SONY], [TYPE, MOBILE]],
            [
              /sony tablet [ps]/i,
              /\b(?:sony)?sgp\w+(?: bui|\))/i
            ],
            [[MODEL, "Xperia Tablet"], [VENDOR, SONY], [TYPE, TABLET]],
            [
              // OnePlus
              / (kb2005|in20[12]5|be20[12][59])\b/i,
              /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i
            ],
            [MODEL, [VENDOR, "OnePlus"], [TYPE, MOBILE]],
            [
              // Amazon
              /(alexa)webm/i,
              /(kf[a-z]{2}wi|aeo(?!bc)\w\w)( bui|\))/i,
              // Kindle Fire without Silk / Echo Show
              /(kf[a-z]+)( bui|\)).+silk\//i
              // Kindle Fire HD
            ],
            [MODEL, [VENDOR, AMAZON], [TYPE, TABLET]],
            [
              /((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i
              // Fire Phone
            ],
            [[MODEL, /(.+)/g, "Fire Phone $1"], [VENDOR, AMAZON], [TYPE, MOBILE]],
            [
              // BlackBerry
              /(playbook);[-\w\),; ]+(rim)/i
              // BlackBerry PlayBook
            ],
            [MODEL, VENDOR, [TYPE, TABLET]],
            [
              /\b((?:bb[a-f]|st[hv])100-\d)/i,
              /\(bb10; (\w+)/i
              // BlackBerry 10
            ],
            [MODEL, [VENDOR, BLACKBERRY], [TYPE, MOBILE]],
            [
              // Asus
              /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i
            ],
            [MODEL, [VENDOR, ASUS], [TYPE, TABLET]],
            [
              / (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i
            ],
            [MODEL, [VENDOR, ASUS], [TYPE, MOBILE]],
            [
              // HTC
              /(nexus 9)/i
              // HTC Nexus 9
            ],
            [MODEL, [VENDOR, "HTC"], [TYPE, TABLET]],
            [
              /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,
              // HTC
              // ZTE
              /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
              /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i
              // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
            ],
            [VENDOR, [MODEL, /_/g, " "], [TYPE, MOBILE]],
            [
              // TCL
              /droid [\w\.]+; ((?:8[14]9[16]|9(?:0(?:48|60|8[01])|1(?:3[27]|66)|2(?:6[69]|9[56])|466))[gqswx])\w*(\)| bui)/i
            ],
            [MODEL, [VENDOR, "TCL"], [TYPE, TABLET]],
            [
              // itel
              /(itel) ((\w+))/i
            ],
            [[VENDOR, lowerize], MODEL, [TYPE, strMapper, { "tablet": ["p10001l", "w7001"], "*": "mobile" }]],
            [
              // Acer
              /droid.+; ([ab][1-7]-?[0178a]\d\d?)/i
            ],
            [MODEL, [VENDOR, "Acer"], [TYPE, TABLET]],
            [
              // Meizu
              /droid.+; (m[1-5] note) bui/i,
              /\bmz-([-\w]{2,})/i
            ],
            [MODEL, [VENDOR, "Meizu"], [TYPE, MOBILE]],
            [
              // Ulefone
              /; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i
            ],
            [MODEL, [VENDOR, "Ulefone"], [TYPE, MOBILE]],
            [
              // Nothing
              /droid.+; (a(?:015|06[35]|142p?))/i
            ],
            [MODEL, [VENDOR, "Nothing"], [TYPE, MOBILE]],
            [
              // MIXED
              /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron|infinix|tecno)[-_ ]?([-\w]*)/i,
              // BlackBerry/BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
              /(hp) ([\w ]+\w)/i,
              // HP iPAQ
              /(asus)-?(\w+)/i,
              // Asus
              /(microsoft); (lumia[\w ]+)/i,
              // Microsoft Lumia
              /(lenovo)[-_ ]?([-\w]+)/i,
              // Lenovo
              /(jolla)/i,
              // Jolla
              /(oppo) ?([\w ]+) bui/i
              // OPPO
            ],
            [VENDOR, MODEL, [TYPE, MOBILE]],
            [
              /(kobo)\s(ereader|touch)/i,
              // Kobo
              /(archos) (gamepad2?)/i,
              // Archos
              /(hp).+(touchpad(?!.+tablet)|tablet)/i,
              // HP TouchPad
              /(kindle)\/([\w\.]+)/i,
              // Kindle
              /(nook)[\w ]+build\/(\w+)/i,
              // Nook
              /(dell) (strea[kpr\d ]*[\dko])/i,
              // Dell Streak
              /(le[- ]+pan)[- ]+(\w{1,9}) bui/i,
              // Le Pan Tablets
              /(trinity)[- ]*(t\d{3}) bui/i,
              // Trinity Tablets
              /(gigaset)[- ]+(q\w{1,9}) bui/i,
              // Gigaset Tablets
              /(vodafone) ([\w ]+)(?:\)| bui)/i
              // Vodafone
            ],
            [VENDOR, MODEL, [TYPE, TABLET]],
            [
              /(surface duo)/i
              // Surface Duo
            ],
            [MODEL, [VENDOR, MICROSOFT], [TYPE, TABLET]],
            [
              /droid [\d\.]+; (fp\du?)(?: b|\))/i
              // Fairphone
            ],
            [MODEL, [VENDOR, "Fairphone"], [TYPE, MOBILE]],
            [
              /(u304aa)/i
              // AT&T
            ],
            [MODEL, [VENDOR, "AT&T"], [TYPE, MOBILE]],
            [
              /\bsie-(\w*)/i
              // Siemens
            ],
            [MODEL, [VENDOR, "Siemens"], [TYPE, MOBILE]],
            [
              /\b(rct\w+) b/i
              // RCA Tablets
            ],
            [MODEL, [VENDOR, "RCA"], [TYPE, TABLET]],
            [
              /\b(venue[\d ]{2,7}) b/i
              // Dell Venue Tablets
            ],
            [MODEL, [VENDOR, "Dell"], [TYPE, TABLET]],
            [
              /\b(q(?:mv|ta)\w+) b/i
              // Verizon Tablet
            ],
            [MODEL, [VENDOR, "Verizon"], [TYPE, TABLET]],
            [
              /\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i
              // Barnes & Noble Tablet
            ],
            [MODEL, [VENDOR, "Barnes & Noble"], [TYPE, TABLET]],
            [
              /\b(tm\d{3}\w+) b/i
            ],
            [MODEL, [VENDOR, "NuVision"], [TYPE, TABLET]],
            [
              /\b(k88) b/i
              // ZTE K Series Tablet
            ],
            [MODEL, [VENDOR, "ZTE"], [TYPE, TABLET]],
            [
              /\b(nx\d{3}j) b/i
              // ZTE Nubia
            ],
            [MODEL, [VENDOR, "ZTE"], [TYPE, MOBILE]],
            [
              /\b(gen\d{3}) b.+49h/i
              // Swiss GEN Mobile
            ],
            [MODEL, [VENDOR, "Swiss"], [TYPE, MOBILE]],
            [
              /\b(zur\d{3}) b/i
              // Swiss ZUR Tablet
            ],
            [MODEL, [VENDOR, "Swiss"], [TYPE, TABLET]],
            [
              /\b((zeki)?tb.*\b) b/i
              // Zeki Tablets
            ],
            [MODEL, [VENDOR, "Zeki"], [TYPE, TABLET]],
            [
              /\b([yr]\d{2}) b/i,
              /\b(dragon[- ]+touch |dt)(\w{5}) b/i
              // Dragon Touch Tablet
            ],
            [[VENDOR, "Dragon Touch"], MODEL, [TYPE, TABLET]],
            [
              /\b(ns-?\w{0,9}) b/i
              // Insignia Tablets
            ],
            [MODEL, [VENDOR, "Insignia"], [TYPE, TABLET]],
            [
              /\b((nxa|next)-?\w{0,9}) b/i
              // NextBook Tablets
            ],
            [MODEL, [VENDOR, "NextBook"], [TYPE, TABLET]],
            [
              /\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i
              // Voice Xtreme Phones
            ],
            [[VENDOR, "Voice"], MODEL, [TYPE, MOBILE]],
            [
              /\b(lvtel\-)?(v1[12]) b/i
              // LvTel Phones
            ],
            [[VENDOR, "LvTel"], MODEL, [TYPE, MOBILE]],
            [
              /\b(ph-1) /i
              // Essential PH-1
            ],
            [MODEL, [VENDOR, "Essential"], [TYPE, MOBILE]],
            [
              /\b(v(100md|700na|7011|917g).*\b) b/i
              // Envizen Tablets
            ],
            [MODEL, [VENDOR, "Envizen"], [TYPE, TABLET]],
            [
              /\b(trio[-\w\. ]+) b/i
              // MachSpeed Tablets
            ],
            [MODEL, [VENDOR, "MachSpeed"], [TYPE, TABLET]],
            [
              /\btu_(1491) b/i
              // Rotor Tablets
            ],
            [MODEL, [VENDOR, "Rotor"], [TYPE, TABLET]],
            [
              /(shield[\w ]+) b/i
              // Nvidia Shield Tablets
            ],
            [MODEL, [VENDOR, "Nvidia"], [TYPE, TABLET]],
            [
              /(sprint) (\w+)/i
              // Sprint Phones
            ],
            [VENDOR, MODEL, [TYPE, MOBILE]],
            [
              /(kin\.[onetw]{3})/i
              // Microsoft Kin
            ],
            [[MODEL, /\./g, " "], [VENDOR, MICROSOFT], [TYPE, MOBILE]],
            [
              /droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i
              // Zebra
            ],
            [MODEL, [VENDOR, ZEBRA], [TYPE, TABLET]],
            [
              /droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i
            ],
            [MODEL, [VENDOR, ZEBRA], [TYPE, MOBILE]],
            [
              ///////////////////
              // SMARTTVS
              ///////////////////
              /smart-tv.+(samsung)/i
              // Samsung
            ],
            [VENDOR, [TYPE, SMARTTV]],
            [
              /hbbtv.+maple;(\d+)/i
            ],
            [[MODEL, /^/, "SmartTV"], [VENDOR, SAMSUNG], [TYPE, SMARTTV]],
            [
              /(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i
              // LG SmartTV
            ],
            [[VENDOR, LG], [TYPE, SMARTTV]],
            [
              /(apple) ?tv/i
              // Apple TV
            ],
            [VENDOR, [MODEL, APPLE + " TV"], [TYPE, SMARTTV]],
            [
              /crkey/i
              // Google Chromecast
            ],
            [[MODEL, CHROME + "cast"], [VENDOR, GOOGLE], [TYPE, SMARTTV]],
            [
              /droid.+aft(\w+)( bui|\))/i
              // Fire TV
            ],
            [MODEL, [VENDOR, AMAZON], [TYPE, SMARTTV]],
            [
              /\(dtv[\);].+(aquos)/i,
              /(aquos-tv[\w ]+)\)/i
              // Sharp
            ],
            [MODEL, [VENDOR, SHARP], [TYPE, SMARTTV]],
            [
              /(bravia[\w ]+)( bui|\))/i
              // Sony
            ],
            [MODEL, [VENDOR, SONY], [TYPE, SMARTTV]],
            [
              /(mitv-\w{5}) bui/i
              // Xiaomi
            ],
            [MODEL, [VENDOR, XIAOMI], [TYPE, SMARTTV]],
            [
              /Hbbtv.*(technisat) (.*);/i
              // TechniSAT
            ],
            [VENDOR, MODEL, [TYPE, SMARTTV]],
            [
              /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,
              // Roku
              /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i
              // HbbTV devices
            ],
            [[VENDOR, trim], [MODEL, trim], [TYPE, SMARTTV]],
            [
              /\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i
              // SmartTV from Unidentified Vendors
            ],
            [[TYPE, SMARTTV]],
            [
              ///////////////////
              // CONSOLES
              ///////////////////
              /(ouya)/i,
              // Ouya
              /(nintendo) ([wids3utch]+)/i
              // Nintendo
            ],
            [VENDOR, MODEL, [TYPE, CONSOLE]],
            [
              /droid.+; (shield) bui/i
              // Nvidia
            ],
            [MODEL, [VENDOR, "Nvidia"], [TYPE, CONSOLE]],
            [
              /(playstation [345portablevi]+)/i
              // Playstation
            ],
            [MODEL, [VENDOR, SONY], [TYPE, CONSOLE]],
            [
              /\b(xbox(?: one)?(?!; xbox))[\); ]/i
              // Microsoft Xbox
            ],
            [MODEL, [VENDOR, MICROSOFT], [TYPE, CONSOLE]],
            [
              ///////////////////
              // WEARABLES
              ///////////////////
              /\b(sm-[lr]\d\d[05][fnuw]?s?)\b/i
              // Samsung Galaxy Watch
            ],
            [MODEL, [VENDOR, SAMSUNG], [TYPE, WEARABLE]],
            [
              /((pebble))app/i
              // Pebble
            ],
            [VENDOR, MODEL, [TYPE, WEARABLE]],
            [
              /(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i
              // Apple Watch
            ],
            [MODEL, [VENDOR, APPLE], [TYPE, WEARABLE]],
            [
              /droid.+; (glass) \d/i
              // Google Glass
            ],
            [MODEL, [VENDOR, GOOGLE], [TYPE, WEARABLE]],
            [
              /droid.+; (wt63?0{2,3})\)/i
            ],
            [MODEL, [VENDOR, ZEBRA], [TYPE, WEARABLE]],
            [
              /(quest( \d| pro)?)/i
              // Oculus Quest
            ],
            [MODEL, [VENDOR, FACEBOOK], [TYPE, WEARABLE]],
            [
              ///////////////////
              // EMBEDDED
              ///////////////////
              /(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i
              // Tesla
            ],
            [VENDOR, [TYPE, EMBEDDED]],
            [
              /(aeobc)\b/i
              // Echo Dot
            ],
            [MODEL, [VENDOR, AMAZON], [TYPE, EMBEDDED]],
            [
              ////////////////////
              // MIXED (GENERIC)
              ///////////////////
              /droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i
              // Android Phones from Unidentified Vendors
            ],
            [MODEL, [TYPE, MOBILE]],
            [
              /droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i
              // Android Tablets from Unidentified Vendors
            ],
            [MODEL, [TYPE, TABLET]],
            [
              /\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i
              // Unidentifiable Tablet
            ],
            [[TYPE, TABLET]],
            [
              /(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i
              // Unidentifiable Mobile
            ],
            [[TYPE, MOBILE]],
            [
              /(android[-\w\. ]{0,9});.+buil/i
              // Generic Android Device
            ],
            [MODEL, [VENDOR, "Generic"]]
          ],
          engine: [
            [
              /windows.+ edge\/([\w\.]+)/i
              // EdgeHTML
            ],
            [VERSION7, [NAME, EDGE + "HTML"]],
            [
              /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i
              // Blink
            ],
            [VERSION7, [NAME, "Blink"]],
            [
              /(presto)\/([\w\.]+)/i,
              // Presto
              /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,
              // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna
              /ekioh(flow)\/([\w\.]+)/i,
              // Flow
              /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,
              // KHTML/Tasman/Links
              /(icab)[\/ ]([23]\.[\d\.]+)/i,
              // iCab
              /\b(libweb)/i
            ],
            [NAME, VERSION7],
            [
              /rv\:([\w\.]{1,9})\b.+(gecko)/i
              // Gecko
            ],
            [VERSION7, NAME]
          ],
          os: [
            [
              // Windows
              /microsoft (windows) (vista|xp)/i
              // Windows (iTunes)
            ],
            [NAME, VERSION7],
            [
              /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i
              // Windows Phone
            ],
            [NAME, [VERSION7, strMapper, windowsVersionMap]],
            [
              /windows nt 6\.2; (arm)/i,
              // Windows RT
              /windows[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i,
              /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i
            ],
            [[VERSION7, strMapper, windowsVersionMap], [NAME, "Windows"]],
            [
              // iOS/macOS
              /ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i,
              // iOS
              /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i,
              /cfnetwork\/.+darwin/i
            ],
            [[VERSION7, /_/g, "."], [NAME, "iOS"]],
            [
              /(mac os x) ?([\w\. ]*)/i,
              /(macintosh|mac_powerpc\b)(?!.+haiku)/i
              // Mac OS
            ],
            [[NAME, MAC_OS], [VERSION7, /_/g, "."]],
            [
              // Mobile OSes
              /droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i
              // Android-x86/HarmonyOS
            ],
            [VERSION7, NAME],
            [
              // Android/WebOS/QNX/Bada/RIM/Maemo/MeeGo/Sailfish OS
              /(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i,
              /(blackberry)\w*\/([\w\.]*)/i,
              // Blackberry
              /(tizen|kaios)[\/ ]([\w\.]+)/i,
              // Tizen/KaiOS
              /\((series40);/i
              // Series 40
            ],
            [NAME, VERSION7],
            [
              /\(bb(10);/i
              // BlackBerry 10
            ],
            [VERSION7, [NAME, BLACKBERRY]],
            [
              /(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i
              // Symbian
            ],
            [VERSION7, [NAME, "Symbian"]],
            [
              /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i
              // Firefox OS
            ],
            [VERSION7, [NAME, FIREFOX + " OS"]],
            [
              /web0s;.+rt(tv)/i,
              /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i
              // WebOS
            ],
            [VERSION7, [NAME, "webOS"]],
            [
              /watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i
              // watchOS
            ],
            [VERSION7, [NAME, "watchOS"]],
            [
              // Google Chromecast
              /crkey\/([\d\.]+)/i
              // Google Chromecast
            ],
            [VERSION7, [NAME, CHROME + "cast"]],
            [
              /(cros) [\w]+(?:\)| ([\w\.]+)\b)/i
              // Chromium OS
            ],
            [[NAME, CHROMIUM_OS], VERSION7],
            [
              // Smart TVs
              /panasonic;(viera)/i,
              // Panasonic Viera
              /(netrange)mmh/i,
              // Netrange
              /(nettv)\/(\d+\.[\w\.]+)/i,
              // NetTV
              // Console
              /(nintendo|playstation) ([wids345portablevuch]+)/i,
              // Nintendo/Playstation
              /(xbox); +xbox ([^\);]+)/i,
              // Microsoft Xbox (360, One, X, S, Series X, Series S)
              // Other
              /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,
              // Joli/Palm
              /(mint)[\/\(\) ]?(\w*)/i,
              // Mint
              /(mageia|vectorlinux)[; ]/i,
              // Mageia/VectorLinux
              /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
              // Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware/Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus/Raspbian/Plan9/Minix/RISCOS/Contiki/Deepin/Manjaro/elementary/Sabayon/Linspire
              /(hurd|linux) ?([\w\.]*)/i,
              // Hurd/Linux
              /(gnu) ?([\w\.]*)/i,
              // GNU
              /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,
              // FreeBSD/NetBSD/OpenBSD/PC-BSD/GhostBSD/DragonFly
              /(haiku) (\w+)/i
              // Haiku
            ],
            [NAME, VERSION7],
            [
              /(sunos) ?([\w\.\d]*)/i
              // Solaris
            ],
            [[NAME, "Solaris"], VERSION7],
            [
              /((?:open)?solaris)[-\/ ]?([\w\.]*)/i,
              // Solaris
              /(aix) ((\d)(?=\.|\)| )[\w\.])*/i,
              // AIX
              /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i,
              // BeOS/OS2/AmigaOS/MorphOS/OpenVMS/Fuchsia/HP-UX/SerenityOS
              /(unix) ?([\w\.]*)/i
              // UNIX
            ],
            [NAME, VERSION7]
          ]
        };
        var UAParser2 = function(ua, extensions) {
          if (typeof ua === OBJ_TYPE) {
            extensions = ua;
            ua = undefined2;
          }
          if (!(this instanceof UAParser2)) {
            return new UAParser2(ua, extensions).getResult();
          }
          var _navigator = typeof window2 !== UNDEF_TYPE && window2.navigator ? window2.navigator : undefined2;
          var _ua = ua || (_navigator && _navigator.userAgent ? _navigator.userAgent : EMPTY);
          var _uach = _navigator && _navigator.userAgentData ? _navigator.userAgentData : undefined2;
          var _rgxmap = extensions ? extend(regexes, extensions) : regexes;
          var _isSelfNav = _navigator && _navigator.userAgent == _ua;
          this.getBrowser = function() {
            var _browser = {};
            _browser[NAME] = undefined2;
            _browser[VERSION7] = undefined2;
            rgxMapper.call(_browser, _ua, _rgxmap.browser);
            _browser[MAJOR] = majorize(_browser[VERSION7]);
            if (_isSelfNav && _navigator && _navigator.brave && typeof _navigator.brave.isBrave == FUNC_TYPE) {
              _browser[NAME] = "Brave";
            }
            return _browser;
          };
          this.getCPU = function() {
            var _cpu = {};
            _cpu[ARCHITECTURE] = undefined2;
            rgxMapper.call(_cpu, _ua, _rgxmap.cpu);
            return _cpu;
          };
          this.getDevice = function() {
            var _device = {};
            _device[VENDOR] = undefined2;
            _device[MODEL] = undefined2;
            _device[TYPE] = undefined2;
            rgxMapper.call(_device, _ua, _rgxmap.device);
            if (_isSelfNav && !_device[TYPE] && _uach && _uach.mobile) {
              _device[TYPE] = MOBILE;
            }
            if (_isSelfNav && _device[MODEL] == "Macintosh" && _navigator && typeof _navigator.standalone !== UNDEF_TYPE && _navigator.maxTouchPoints && _navigator.maxTouchPoints > 2) {
              _device[MODEL] = "iPad";
              _device[TYPE] = TABLET;
            }
            return _device;
          };
          this.getEngine = function() {
            var _engine = {};
            _engine[NAME] = undefined2;
            _engine[VERSION7] = undefined2;
            rgxMapper.call(_engine, _ua, _rgxmap.engine);
            return _engine;
          };
          this.getOS = function() {
            var _os = {};
            _os[NAME] = undefined2;
            _os[VERSION7] = undefined2;
            rgxMapper.call(_os, _ua, _rgxmap.os);
            if (_isSelfNav && !_os[NAME] && _uach && _uach.platform && _uach.platform != "Unknown") {
              _os[NAME] = _uach.platform.replace(/chrome os/i, CHROMIUM_OS).replace(/macos/i, MAC_OS);
            }
            return _os;
          };
          this.getResult = function() {
            return {
              ua: this.getUA(),
              browser: this.getBrowser(),
              engine: this.getEngine(),
              os: this.getOS(),
              device: this.getDevice(),
              cpu: this.getCPU()
            };
          };
          this.getUA = function() {
            return _ua;
          };
          this.setUA = function(ua2) {
            _ua = typeof ua2 === STR_TYPE && ua2.length > UA_MAX_LENGTH ? trim(ua2, UA_MAX_LENGTH) : ua2;
            return this;
          };
          this.setUA(_ua);
          return this;
        };
        UAParser2.VERSION = LIBVERSION;
        UAParser2.BROWSER = enumerize([NAME, VERSION7, MAJOR]);
        UAParser2.CPU = enumerize([ARCHITECTURE]);
        UAParser2.DEVICE = enumerize([MODEL, VENDOR, TYPE, CONSOLE, MOBILE, SMARTTV, TABLET, WEARABLE, EMBEDDED]);
        UAParser2.ENGINE = UAParser2.OS = enumerize([NAME, VERSION7]);
        if (typeof exports !== UNDEF_TYPE) {
          if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser2;
          }
          exports.UAParser = UAParser2;
        } else {
          if (typeof define === FUNC_TYPE && define.amd) {
            define(function() {
              return UAParser2;
            });
          } else if (typeof window2 !== UNDEF_TYPE) {
            window2.UAParser = UAParser2;
          }
        }
        var $2 = typeof window2 !== UNDEF_TYPE && (window2.jQuery || window2.Zepto);
        if ($2 && !$2.ua) {
          var parser = new UAParser2();
          $2.ua = parser.getResult();
          $2.ua.get = function() {
            return parser.getUA();
          };
          $2.ua.set = function(ua) {
            parser.setUA(ua);
            var result = parser.getResult();
            for (var prop in result) {
              $2.ua[prop] = result[prop];
            }
          };
        }
      })(typeof window === "object" ? window : exports);
    }
  });

  // node_modules/@opentelemetry/api/build/esm/platform/browser/globalThis.js
  var _globalThis = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/api/build/esm/version.js
  var VERSION = "1.9.0";

  // node_modules/@opentelemetry/api/build/esm/internal/semver.js
  var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
    var rejectedVersions = /* @__PURE__ */ new Set();
    var myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) {
      return function() {
        return false;
      };
    }
    var ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4]
    };
    if (ownVersionParsed.prerelease != null) {
      return function isExactmatch(globalVersion) {
        return globalVersion === ownVersion;
      };
    }
    function _reject(v2) {
      rejectedVersions.add(v2);
      return false;
    }
    function _accept(v2) {
      acceptedVersions.add(v2);
      return true;
    }
    return function isCompatible2(globalVersion) {
      if (acceptedVersions.has(globalVersion)) {
        return true;
      }
      if (rejectedVersions.has(globalVersion)) {
        return false;
      }
      var globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) {
        return _reject(globalVersion);
      }
      var globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4]
      };
      if (globalVersionParsed.prerelease != null) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major !== globalVersionParsed.major) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major === 0) {
        if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
          return _accept(globalVersion);
        }
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    };
  }
  var isCompatible = _makeCompatibilityCheck(VERSION);

  // node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
  var major = VERSION.split(".")[0];
  var GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
  var _global = _globalThis;
  function registerGlobal(type, instance, diag3, allowOverride) {
    var _a;
    if (allowOverride === void 0) {
      allowOverride = false;
    }
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
      version: VERSION
    };
    if (!allowOverride && api[type]) {
      var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
      diag3.error(err.stack || err.message);
      return false;
    }
    if (api.version !== VERSION) {
      var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
      diag3.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
    return true;
  }
  function getGlobal(type) {
    var _a, _b;
    var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
    if (!globalVersion || !isCompatible(globalVersion)) {
      return;
    }
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
  }
  function unregisterGlobal(type, diag3) {
    diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) {
      delete api[type];
    }
  }

  // node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
  var __read = function(o2, n2) {
    var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
    if (!m2) return o2;
    var i2 = m2.call(o2), r2, ar = [], e2;
    try {
      while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
    } catch (error) {
      e2 = { error };
    } finally {
      try {
        if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
      } finally {
        if (e2) throw e2.error;
      }
    }
    return ar;
  };
  var __spreadArray = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var DiagComponentLogger = (
    /** @class */
    function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    }()
  );
  function logProxy(funcName, namespace, args) {
    var logger3 = getGlobal("diag");
    if (!logger3) {
      return;
    }
    args.unshift(namespace);
    return logger3[funcName].apply(logger3, __spreadArray([], __read(args), false));
  }

  // node_modules/@opentelemetry/api/build/esm/diag/types.js
  var DiagLogLevel;
  (function(DiagLogLevel2) {
    DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
    DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
    DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
    DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
    DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
    DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
    DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
  })(DiagLogLevel || (DiagLogLevel = {}));

  // node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
  function createLogLevelDiagLogger(maxLevel, logger3) {
    if (maxLevel < DiagLogLevel.NONE) {
      maxLevel = DiagLogLevel.NONE;
    } else if (maxLevel > DiagLogLevel.ALL) {
      maxLevel = DiagLogLevel.ALL;
    }
    logger3 = logger3 || {};
    function _filterFunc(funcName, theLevel) {
      var theFunc = logger3[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) {
        return theFunc.bind(logger3);
      }
      return function() {
      };
    }
    return {
      error: _filterFunc("error", DiagLogLevel.ERROR),
      warn: _filterFunc("warn", DiagLogLevel.WARN),
      info: _filterFunc("info", DiagLogLevel.INFO),
      debug: _filterFunc("debug", DiagLogLevel.DEBUG),
      verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
    };
  }

  // node_modules/@opentelemetry/api/build/esm/api/diag.js
  var __read2 = function(o2, n2) {
    var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
    if (!m2) return o2;
    var i2 = m2.call(o2), r2, ar = [], e2;
    try {
      while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
    } catch (error) {
      e2 = { error };
    } finally {
      try {
        if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
      } finally {
        if (e2) throw e2.error;
      }
    }
    return ar;
  };
  var __spreadArray2 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var API_NAME = "diag";
  var DiagAPI = (
    /** @class */
    function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger3 = getGlobal("diag");
            if (!logger3)
              return;
            return logger3[funcName].apply(logger3, __spreadArray2([], __read2(args), false));
          };
        }
        var self2 = this;
        var setLogger = function(logger3, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger3 === self2) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger3);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal("diag", newLogger, self2, true);
        };
        self2.setLogger = setLogger;
        self2.disable = function() {
          unregisterGlobal(API_NAME, self2);
        };
        self2.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self2.verbose = _logProxy("verbose");
        self2.debug = _logProxy("debug");
        self2.info = _logProxy("info");
        self2.warn = _logProxy("warn");
        self2.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
  var __read3 = function(o2, n2) {
    var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
    if (!m2) return o2;
    var i2 = m2.call(o2), r2, ar = [], e2;
    try {
      while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
    } catch (error) {
      e2 = { error };
    } finally {
      try {
        if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
      } finally {
        if (e2) throw e2.error;
      }
    }
    return ar;
  };
  var __values = function(o2) {
    var s2 = typeof Symbol === "function" && Symbol.iterator, m2 = s2 && o2[s2], i2 = 0;
    if (m2) return m2.call(o2);
    if (o2 && typeof o2.length === "number") return {
      next: function() {
        if (o2 && i2 >= o2.length) o2 = void 0;
        return { value: o2 && o2[i2++], done: !o2 };
      }
    };
    throw new TypeError(s2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var BaggageImpl = (
    /** @class */
    function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k2 = _b[0], v2 = _b[1];
          return [k2, v2];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
  var baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");

  // node_modules/@opentelemetry/api/build/esm/baggage/utils.js
  var diag = DiagAPI.instance();
  function createBaggage(entries) {
    if (entries === void 0) {
      entries = {};
    }
    return new BaggageImpl(new Map(Object.entries(entries)));
  }
  function baggageEntryMetadataFromString(str) {
    if (typeof str !== "string") {
      diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
      str = "";
    }
    return {
      __TYPE__: baggageEntryMetadataSymbol,
      toString: function() {
        return str;
      }
    };
  }

  // node_modules/@opentelemetry/api/build/esm/context/context.js
  function createContextKey(description) {
    return Symbol.for(description);
  }
  var BaseContext = (
    /** @class */
    /* @__PURE__ */ function() {
      function BaseContext2(parentContext) {
        var self2 = this;
        self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self2.getValue = function(key) {
          return self2._currentContext.get(key);
        };
        self2.setValue = function(key, value) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self2.deleteValue = function(key) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    }()
  );
  var ROOT_CONTEXT = new BaseContext();

  // node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
  var consoleMap = [
    { n: "error", c: "error" },
    { n: "warn", c: "warn" },
    { n: "info", c: "info" },
    { n: "debug", c: "debug" },
    { n: "verbose", c: "trace" }
  ];
  var DiagConsoleLogger = (
    /** @class */
    /* @__PURE__ */ function() {
      function DiagConsoleLogger2() {
        function _consoleFunc(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            if (console) {
              var theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
              if (typeof theFunc === "function") {
                return theFunc.apply(console, args);
              }
            }
          };
        }
        for (var i2 = 0; i2 < consoleMap.length; i2++) {
          this[consoleMap[i2].n] = _consoleFunc(consoleMap[i2].c);
        }
      }
      return DiagConsoleLogger2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
  var __extends = /* @__PURE__ */ function() {
    var extendStatics = function(d2, b2) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d3, b3) {
        d3.__proto__ = b3;
      } || function(d3, b3) {
        for (var p2 in b3) if (Object.prototype.hasOwnProperty.call(b3, p2)) d3[p2] = b3[p2];
      };
      return extendStatics(d2, b2);
    };
    return function(d2, b2) {
      if (typeof b2 !== "function" && b2 !== null)
        throw new TypeError("Class extends value " + String(b2) + " is not a constructor or null");
      extendStatics(d2, b2);
      function __() {
        this.constructor = d2;
      }
      d2.prototype = b2 === null ? Object.create(b2) : (__.prototype = b2.prototype, new __());
    };
  }();
  var NoopMeter = (
    /** @class */
    function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    }()
  );
  var NoopMetric = (
    /** @class */
    /* @__PURE__ */ function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    }()
  );
  var NoopCounterMetric = (
    /** @class */
    function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    }(NoopMetric)
  );
  var NoopUpDownCounterMetric = (
    /** @class */
    function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    }(NoopMetric)
  );
  var NoopGaugeMetric = (
    /** @class */
    function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    }(NoopMetric)
  );
  var NoopHistogramMetric = (
    /** @class */
    function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    }(NoopMetric)
  );
  var NoopObservableMetric = (
    /** @class */
    function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    }()
  );
  var NoopObservableCounterMetric = (
    /** @class */
    function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    }(NoopObservableMetric)
  );
  var NoopObservableGaugeMetric = (
    /** @class */
    function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    }(NoopObservableMetric)
  );
  var NoopObservableUpDownCounterMetric = (
    /** @class */
    function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    }(NoopObservableMetric)
  );
  var NOOP_METER = new NoopMeter();
  var NOOP_COUNTER_METRIC = new NoopCounterMetric();
  var NOOP_GAUGE_METRIC = new NoopGaugeMetric();
  var NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
  var NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
  var NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
  var NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
  var NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  function createNoopMeter() {
    return NOOP_METER;
  }

  // node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
  var ValueType;
  (function(ValueType2) {
    ValueType2[ValueType2["INT"] = 0] = "INT";
    ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
  })(ValueType || (ValueType = {}));

  // node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
  var defaultTextMapGetter = {
    get: function(carrier, key) {
      if (carrier == null) {
        return void 0;
      }
      return carrier[key];
    },
    keys: function(carrier) {
      if (carrier == null) {
        return [];
      }
      return Object.keys(carrier);
    }
  };
  var defaultTextMapSetter = {
    set: function(carrier, key, value) {
      if (carrier == null) {
        return;
      }
      carrier[key] = value;
    }
  };

  // node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
  var __read4 = function(o2, n2) {
    var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
    if (!m2) return o2;
    var i2 = m2.call(o2), r2, ar = [], e2;
    try {
      while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
    } catch (error) {
      e2 = { error };
    } finally {
      try {
        if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
      } finally {
        if (e2) throw e2.error;
      }
    }
    return ar;
  };
  var __spreadArray3 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var NoopContextManager = (
    /** @class */
    function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/api/context.js
  var __read5 = function(o2, n2) {
    var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
    if (!m2) return o2;
    var i2 = m2.call(o2), r2, ar = [], e2;
    try {
      while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
    } catch (error) {
      e2 = { error };
    } finally {
      try {
        if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
      } finally {
        if (e2) throw e2.error;
      }
    }
    return ar;
  };
  var __spreadArray4 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var API_NAME2 = "context";
  var NOOP_CONTEXT_MANAGER = new NoopContextManager();
  var ContextAPI = (
    /** @class */
    function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      };
      return ContextAPI2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
  var TraceFlags;
  (function(TraceFlags2) {
    TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
    TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
  })(TraceFlags || (TraceFlags = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
  var INVALID_SPANID = "0000000000000000";
  var INVALID_TRACEID = "00000000000000000000000000000000";
  var INVALID_SPAN_CONTEXT = {
    traceId: INVALID_TRACEID,
    spanId: INVALID_SPANID,
    traceFlags: TraceFlags.NONE
  };

  // node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
  var NonRecordingSpan = (
    /** @class */
    function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
  var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  function getSpan(context2) {
    return context2.getValue(SPAN_KEY) || void 0;
  }
  function getActiveSpan() {
    return getSpan(ContextAPI.getInstance().active());
  }
  function setSpan(context2, span) {
    return context2.setValue(SPAN_KEY, span);
  }
  function deleteSpan(context2) {
    return context2.deleteValue(SPAN_KEY);
  }
  function setSpanContext(context2, spanContext) {
    return setSpan(context2, new NonRecordingSpan(spanContext));
  }
  function getSpanContext(context2) {
    var _a;
    return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
  }

  // node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
  var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
  var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  function isValidTraceId(traceId) {
    return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
  }
  function isValidSpanId(spanId) {
    return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
  }
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan(spanContext);
  }

  // node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
  var contextApi = ContextAPI.getInstance();
  var NoopTracer = (
    /** @class */
    function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    }()
  );
  function isSpanContext(spanContext) {
    return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
  }

  // node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
  var NOOP_TRACER = new NoopTracer();
  var ProxyTracer = (
    /** @class */
    function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
  var NoopTracerProvider = (
    /** @class */
    function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
  var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
  var ProxyTracerProvider = (
    /** @class */
    function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
  var SamplingDecision;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision || (SamplingDecision = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
  var SpanKind;
  (function(SpanKind2) {
    SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
    SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
    SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
    SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
    SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
  })(SpanKind || (SpanKind = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/status.js
  var SpanStatusCode;
  (function(SpanStatusCode2) {
    SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
    SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
    SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
  })(SpanStatusCode || (SpanStatusCode = {}));

  // node_modules/@opentelemetry/api/build/esm/context-api.js
  var context = ContextAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/diag-api.js
  var diag2 = DiagAPI.instance();

  // node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
  var NoopMeterProvider = (
    /** @class */
    function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    }()
  );
  var NOOP_METER_PROVIDER = new NoopMeterProvider();

  // node_modules/@opentelemetry/api/build/esm/api/metrics.js
  var API_NAME3 = "metrics";
  var MetricsAPI = (
    /** @class */
    function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      };
      return MetricsAPI2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/metrics-api.js
  var metrics = MetricsAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
  var NoopTextMapPropagator = (
    /** @class */
    function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
  var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  function getBaggage(context2) {
    return context2.getValue(BAGGAGE_KEY) || void 0;
  }
  function getActiveBaggage() {
    return getBaggage(ContextAPI.getInstance().active());
  }
  function setBaggage(context2, baggage) {
    return context2.setValue(BAGGAGE_KEY, baggage);
  }
  function deleteBaggage(context2) {
    return context2.deleteValue(BAGGAGE_KEY);
  }

  // node_modules/@opentelemetry/api/build/esm/api/propagation.js
  var API_NAME4 = "propagation";
  var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
  var PropagationAPI = (
    /** @class */
    function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/propagation-api.js
  var propagation = PropagationAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/api/trace.js
  var API_NAME5 = "trace";
  var TraceAPI = (
    /** @class */
    function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    }()
  );

  // node_modules/@opentelemetry/api/build/esm/trace-api.js
  var trace = TraceAPI.getInstance();

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/NoopLogger.js
  var NoopLogger = class {
    emit(_logRecord) {
    }
  };
  var NOOP_LOGGER = new NoopLogger();

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/NoopLoggerProvider.js
  var NoopLoggerProvider = class {
    getLogger(_name, _version, _options) {
      return new NoopLogger();
    }
  };
  var NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/ProxyLogger.js
  var ProxyLogger = class {
    constructor(_provider, name, version, options) {
      this._provider = _provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    /**
     * Emit a log record. This method should only be used by log appenders.
     *
     * @param logRecord
     */
    emit(logRecord) {
      this._getLogger().emit(logRecord);
    }
    /**
     * Try to get a logger from the proxy logger provider.
     * If the proxy logger provider has no delegate, return a noop logger.
     */
    _getLogger() {
      if (this._delegate) {
        return this._delegate;
      }
      const logger3 = this._provider.getDelegateLogger(this.name, this.version, this.options);
      if (!logger3) {
        return NOOP_LOGGER;
      }
      this._delegate = logger3;
      return this._delegate;
    }
  };

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
  var ProxyLoggerProvider = class {
    getLogger(name, version, options) {
      var _a;
      return (_a = this.getDelegateLogger(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger(this, name, version, options);
    }
    getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_LOGGER_PROVIDER;
    }
    /**
     * Set the delegate logger provider
     */
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateLogger(name, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name, version, options);
    }
  };

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/platform/browser/globalThis.js
  var _globalThis2 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/internal/global-utils.js
  var GLOBAL_LOGS_API_KEY = Symbol.for("io.opentelemetry.js.api.logs");
  var _global2 = _globalThis2;
  function makeGetter(requiredVersion, instance, fallback) {
    return (version) => version === requiredVersion ? instance : fallback;
  }
  var API_BACKWARDS_COMPATIBILITY_VERSION = 1;

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/api/logs.js
  var LogsAPI = class _LogsAPI {
    constructor() {
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
    static getInstance() {
      if (!this._instance) {
        this._instance = new _LogsAPI();
      }
      return this._instance;
    }
    setGlobalLoggerProvider(provider) {
      if (_global2[GLOBAL_LOGS_API_KEY]) {
        return this.getLoggerProvider();
      }
      _global2[GLOBAL_LOGS_API_KEY] = makeGetter(API_BACKWARDS_COMPATIBILITY_VERSION, provider, NOOP_LOGGER_PROVIDER);
      this._proxyLoggerProvider.setDelegate(provider);
      return provider;
    }
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    getLoggerProvider() {
      var _a, _b;
      return (_b = (_a = _global2[GLOBAL_LOGS_API_KEY]) === null || _a === void 0 ? void 0 : _a.call(_global2, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
    }
    /**
     * Returns a logger from the global logger provider.
     *
     * @returns Logger
     */
    getLogger(name, version, options) {
      return this.getLoggerProvider().getLogger(name, version, options);
    }
    /** Remove the global logger provider */
    disable() {
      delete _global2[GLOBAL_LOGS_API_KEY];
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
  };

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/api-logs/build/esm/index.js
  var logs = LogsAPI.getInstance();

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/instrumentation/build/esm/autoLoaderUtils.js
  function enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider) {
    for (let i2 = 0, j2 = instrumentations.length; i2 < j2; i2++) {
      const instrumentation = instrumentations[i2];
      if (tracerProvider) {
        instrumentation.setTracerProvider(tracerProvider);
      }
      if (meterProvider) {
        instrumentation.setMeterProvider(meterProvider);
      }
      if (loggerProvider && instrumentation.setLoggerProvider) {
        instrumentation.setLoggerProvider(loggerProvider);
      }
      if (!instrumentation.getConfig().enabled) {
        instrumentation.enable();
      }
    }
  }
  function disableInstrumentations(instrumentations) {
    instrumentations.forEach((instrumentation) => instrumentation.disable());
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/instrumentation/build/esm/autoLoader.js
  function registerInstrumentations(options) {
    const tracerProvider = options.tracerProvider || trace.getTracerProvider();
    const meterProvider = options.meterProvider || metrics.getMeterProvider();
    const loggerProvider = options.loggerProvider || logs.getLoggerProvider();
    const instrumentations = options.instrumentations?.flat() ?? [];
    enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider);
    return () => {
      disableInstrumentations(instrumentations);
    };
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/instrumentation/build/esm/shimmer.js
  var logger = console.error.bind(console);
  function defineProperty(obj, name, value) {
    const enumerable = !!obj[name] && Object.prototype.propertyIsEnumerable.call(obj, name);
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable,
      writable: true,
      value
    });
  }
  var wrap = (nodule, name, wrapper) => {
    if (!nodule || !nodule[name]) {
      logger("no original function " + String(name) + " to wrap");
      return;
    }
    if (!wrapper) {
      logger("no wrapper function");
      logger(new Error().stack);
      return;
    }
    const original = nodule[name];
    if (typeof original !== "function" || typeof wrapper !== "function") {
      logger("original object and wrapper must be functions");
      return;
    }
    const wrapped = wrapper(original, name);
    defineProperty(wrapped, "__original", original);
    defineProperty(wrapped, "__unwrap", () => {
      if (nodule[name] === wrapped) {
        defineProperty(nodule, name, original);
      }
    });
    defineProperty(wrapped, "__wrapped", true);
    defineProperty(nodule, name, wrapped);
    return wrapped;
  };
  var massWrap = (nodules, names, wrapper) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to wrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        wrap(nodule, name, wrapper);
      });
    });
  };
  var unwrap = (nodule, name) => {
    if (!nodule || !nodule[name]) {
      logger("no function to unwrap.");
      logger(new Error().stack);
      return;
    }
    const wrapped = nodule[name];
    if (!wrapped.__unwrap) {
      logger("no original to unwrap to -- has " + String(name) + " already been unwrapped?");
    } else {
      wrapped.__unwrap();
      return;
    }
  };
  var massUnwrap = (nodules, names) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to unwrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        unwrap(nodule, name);
      });
    });
  };
  function shimmer(options) {
    if (options && options.logger) {
      if (typeof options.logger !== "function") {
        logger("new logger isn't a function, not replacing");
      } else {
        logger = options.logger;
      }
    }
  }
  shimmer.wrap = wrap;
  shimmer.massWrap = massWrap;
  shimmer.unwrap = unwrap;
  shimmer.massUnwrap = massUnwrap;

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/instrumentation/build/esm/instrumentation.js
  var InstrumentationAbstract = class {
    instrumentationName;
    instrumentationVersion;
    _config = {};
    _tracer;
    _meter;
    _logger;
    _diag;
    constructor(instrumentationName, instrumentationVersion, config) {
      this.instrumentationName = instrumentationName;
      this.instrumentationVersion = instrumentationVersion;
      this.setConfig(config);
      this._diag = diag2.createComponentLogger({
        namespace: instrumentationName
      });
      this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
      this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
      this._logger = logs.getLogger(instrumentationName, instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Api to wrap instrumented method */
    _wrap = wrap;
    /* Api to unwrap instrumented methods */
    _unwrap = unwrap;
    /* Api to mass wrap instrumented method */
    _massWrap = massWrap;
    /* Api to mass unwrap instrumented methods */
    _massUnwrap = massUnwrap;
    /* Returns meter */
    get meter() {
      return this._meter;
    }
    /**
     * Sets MeterProvider to this plugin
     * @param meterProvider
     */
    setMeterProvider(meterProvider) {
      this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Returns logger */
    get logger() {
      return this._logger;
    }
    /**
     * Sets LoggerProvider to this plugin
     * @param loggerProvider
     */
    setLoggerProvider(loggerProvider) {
      this._logger = loggerProvider.getLogger(this.instrumentationName, this.instrumentationVersion);
    }
    /**
     * @experimental
     *
     * Get module definitions defined by {@link init}.
     * This can be used for experimental compile-time instrumentation.
     *
     * @returns an array of {@link InstrumentationModuleDefinition}
     */
    getModuleDefinitions() {
      const initResult = this.init() ?? [];
      if (!Array.isArray(initResult)) {
        return [initResult];
      }
      return initResult;
    }
    /**
     * Sets the new metric instruments with the current Meter.
     */
    _updateMetricInstruments() {
      return;
    }
    /* Returns InstrumentationConfig */
    getConfig() {
      return this._config;
    }
    /**
     * Sets InstrumentationConfig to this plugin
     * @param config
     */
    setConfig(config) {
      this._config = {
        enabled: true,
        ...config
      };
    }
    /**
     * Sets TraceProvider to this plugin
     * @param tracerProvider
     */
    setTracerProvider(tracerProvider) {
      this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    }
    /* Returns tracer */
    get tracer() {
      return this._tracer;
    }
    /**
     * Execute span customization hook, if configured, and log any errors.
     * Any semantics of the trigger and info are defined by the specific instrumentation.
     * @param hookHandler The optional hook handler which the user has configured via instrumentation config
     * @param triggerName The name of the trigger for executing the hook for logging purposes
     * @param span The span to which the hook should be applied
     * @param info The info object to be passed to the hook, with useful data the hook may use
     */
    _runSpanCustomizationHook(hookHandler, triggerName, span, info) {
      if (!hookHandler) {
        return;
      }
      try {
        hookHandler(span, info);
      } catch (e2) {
        this._diag.error(`Error running span customization hook due to exception in handler`, { triggerName }, e2);
      }
    }
  };

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/instrumentation/build/esm/platform/browser/instrumentation.js
  var InstrumentationBase = class extends InstrumentationAbstract {
    constructor(instrumentationName, instrumentationVersion, config) {
      super(instrumentationName, instrumentationVersion, config);
      if (this._config.enabled) {
        this.enable();
      }
    }
  };

  // node_modules/@opentelemetry/core/build/esm/trace/suppress-tracing.js
  var SUPPRESS_TRACING_KEY = createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
  function suppressTracing(context2) {
    return context2.setValue(SUPPRESS_TRACING_KEY, true);
  }
  function isTracingSuppressed(context2) {
    return context2.getValue(SUPPRESS_TRACING_KEY) === true;
  }

  // node_modules/@opentelemetry/core/build/esm/baggage/constants.js
  var BAGGAGE_KEY_PAIR_SEPARATOR = "=";
  var BAGGAGE_PROPERTIES_SEPARATOR = ";";
  var BAGGAGE_ITEMS_SEPARATOR = ",";
  var BAGGAGE_HEADER = "baggage";
  var BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
  var BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
  var BAGGAGE_MAX_TOTAL_LENGTH = 8192;

  // node_modules/@opentelemetry/core/build/esm/baggage/utils.js
  function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce((hValue, current) => {
      const value = `${hValue}${hValue !== "" ? BAGGAGE_ITEMS_SEPARATOR : ""}${current}`;
      return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, "");
  }
  function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(([key, value]) => {
      let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;
      if (value.metadata !== void 0) {
        entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
      }
      return entry;
    });
  }
  function parsePairKeyValue(entry) {
    const valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
      return;
    const keyPairPart = valueProps.shift();
    if (!keyPairPart)
      return;
    const separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0)
      return;
    const key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    const value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    let metadata;
    if (valueProps.length > 0) {
      metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key, value, metadata };
  }

  // node_modules/@opentelemetry/core/build/esm/baggage/propagation/W3CBaggagePropagator.js
  var W3CBaggagePropagator = class {
    inject(context2, carrier, setter) {
      const baggage = propagation.getBaggage(context2);
      if (!baggage || isTracingSuppressed(context2))
        return;
      const keyPairs = getKeyPairs(baggage).filter((pair) => {
        return pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
      }).slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
      const headerValue = serializeKeyPairs(keyPairs);
      if (headerValue.length > 0) {
        setter.set(carrier, BAGGAGE_HEADER, headerValue);
      }
    }
    extract(context2, carrier, getter) {
      const headerValue = getter.get(carrier, BAGGAGE_HEADER);
      const baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;
      if (!baggageString)
        return context2;
      const baggage = {};
      if (baggageString.length === 0) {
        return context2;
      }
      const pairs = baggageString.split(BAGGAGE_ITEMS_SEPARATOR);
      pairs.forEach((entry) => {
        const keyPair = parsePairKeyValue(entry);
        if (keyPair) {
          const baggageEntry = { value: keyPair.value };
          if (keyPair.metadata) {
            baggageEntry.metadata = keyPair.metadata;
          }
          baggage[keyPair.key] = baggageEntry;
        }
      });
      if (Object.entries(baggage).length === 0) {
        return context2;
      }
      return propagation.setBaggage(context2, propagation.createBaggage(baggage));
    }
    fields() {
      return [BAGGAGE_HEADER];
    }
  };

  // node_modules/@opentelemetry/core/build/esm/common/attributes.js
  function sanitizeAttributes(attributes) {
    const out = {};
    if (typeof attributes !== "object" || attributes == null) {
      return out;
    }
    for (const [key, val] of Object.entries(attributes)) {
      if (!isAttributeKey(key)) {
        diag2.warn(`Invalid attribute key: ${key}`);
        continue;
      }
      if (!isAttributeValue(val)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        continue;
      }
      if (Array.isArray(val)) {
        out[key] = val.slice();
      } else {
        out[key] = val;
      }
    }
    return out;
  }
  function isAttributeKey(key) {
    return typeof key === "string" && key.length > 0;
  }
  function isAttributeValue(val) {
    if (val == null) {
      return true;
    }
    if (Array.isArray(val)) {
      return isHomogeneousAttributeValueArray(val);
    }
    return isValidPrimitiveAttributeValue(val);
  }
  function isHomogeneousAttributeValueArray(arr) {
    let type;
    for (const element of arr) {
      if (element == null)
        continue;
      if (!type) {
        if (isValidPrimitiveAttributeValue(element)) {
          type = typeof element;
          continue;
        }
        return false;
      }
      if (typeof element === type) {
        continue;
      }
      return false;
    }
    return true;
  }
  function isValidPrimitiveAttributeValue(val) {
    switch (typeof val) {
      case "number":
      case "boolean":
      case "string":
        return true;
    }
    return false;
  }

  // node_modules/@opentelemetry/core/build/esm/common/logging-error-handler.js
  function loggingErrorHandler() {
    return (ex) => {
      diag2.error(stringifyException(ex));
    };
  }
  function stringifyException(ex) {
    if (typeof ex === "string") {
      return ex;
    } else {
      return JSON.stringify(flattenException(ex));
    }
  }
  function flattenException(ex) {
    const result = {};
    let current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach((propertyName) => {
        if (result[propertyName])
          return;
        const value = current[propertyName];
        if (value) {
          result[propertyName] = String(value);
        }
      });
      current = Object.getPrototypeOf(current);
    }
    return result;
  }

  // node_modules/@opentelemetry/core/build/esm/common/global-error-handler.js
  var delegateHandler = loggingErrorHandler();
  function globalErrorHandler(ex) {
    try {
      delegateHandler(ex);
    } catch {
    }
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getStringFromEnv(_2) {
    return void 0;
  }
  function getNumberFromEnv(_2) {
    return void 0;
  }
  function getStringListFromEnv(_2) {
    return void 0;
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/globalThis.js
  var _globalThis3 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/core/build/esm/platform/browser/performance.js
  var otperformance = performance;

  // node_modules/@opentelemetry/core/build/esm/version.js
  var VERSION2 = "2.1.0";

  // node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_HTTP_URL = "http.url";
  var TMP_HTTP_USER_AGENT = "http.user_agent";
  var SEMATTRS_HTTP_URL = TMP_HTTP_URL;
  var SEMATTRS_HTTP_USER_AGENT = TMP_HTTP_USER_AGENT;

  // node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
  var ATTR_ERROR_TYPE = "error.type";
  var ATTR_EXCEPTION_MESSAGE = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE = "exception.type";
  var ATTR_HTTP_REQUEST_METHOD = "http.request.method";
  var ATTR_HTTP_REQUEST_METHOD_ORIGINAL = "http.request.method_original";
  var ATTR_HTTP_RESPONSE_STATUS_CODE = "http.response.status_code";
  var ATTR_SERVER_ADDRESS = "server.address";
  var ATTR_SERVER_PORT = "server.port";
  var ATTR_SERVICE_NAME = "service.name";
  var ATTR_SERVICE_VERSION = "service.version";
  var ATTR_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
  var TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS = "webjs";
  var ATTR_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
  var ATTR_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
  var ATTR_URL_FULL = "url.full";
  var ATTR_USER_AGENT_ORIGINAL = "user_agent.original";

  // node_modules/@opentelemetry/core/build/esm/semconv.js
  var ATTR_PROCESS_RUNTIME_NAME = "process.runtime.name";

  // node_modules/@opentelemetry/core/build/esm/platform/browser/sdk-info.js
  var SDK_INFO = {
    [ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
    [ATTR_PROCESS_RUNTIME_NAME]: "browser",
    [ATTR_TELEMETRY_SDK_LANGUAGE]: TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS,
    [ATTR_TELEMETRY_SDK_VERSION]: VERSION2
  };

  // node_modules/@opentelemetry/core/build/esm/platform/browser/timer-util.js
  function unrefTimer(_timer) {
  }

  // node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS = 9;
  var NANOSECOND_DIGITS_IN_MILLIS = 6;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    const epochSeconds = epochMillis / 1e3;
    const seconds = Math.trunc(epochSeconds);
    const nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS);
    return [seconds, nanos];
  }
  function getTimeOrigin() {
    let timeOrigin = otperformance.timeOrigin;
    if (typeof timeOrigin !== "number") {
      const perf = otperformance;
      timeOrigin = perf.timing && perf.timing.fetchStart;
    }
    return timeOrigin;
  }
  function hrTime(performanceNow) {
    const timeOrigin = millisToHrTime(getTimeOrigin());
    const now = millisToHrTime(typeof performanceNow === "number" ? performanceNow : otperformance.now());
    return addHrTimes(timeOrigin, now);
  }
  function timeInputToHrTime(time) {
    if (isTimeInputHrTime(time)) {
      return time;
    } else if (typeof time === "number") {
      if (time < getTimeOrigin()) {
        return hrTime(time);
      } else {
        return millisToHrTime(time);
      }
    } else if (time instanceof Date) {
      return millisToHrTime(time.getTime());
    } else {
      throw TypeError("Invalid input type");
    }
  }
  function hrTimeDuration(startTime, endTime) {
    let seconds = endTime[0] - startTime[0];
    let nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  function hrTimeToNanoseconds(time) {
    return time[0] * SECOND_TO_NANOSECONDS + time[1];
  }
  function hrTimeToMicroseconds(time) {
    return time[0] * 1e6 + time[1] / 1e3;
  }
  function isTimeInputHrTime(value) {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  function addHrTimes(time1, time2) {
    const out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }

  // node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode;
  (function(ExportResultCode3) {
    ExportResultCode3[ExportResultCode3["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode3[ExportResultCode3["FAILED"] = 1] = "FAILED";
  })(ExportResultCode || (ExportResultCode = {}));

  // node_modules/@opentelemetry/core/build/esm/propagation/composite.js
  var CompositePropagator = class {
    _propagators;
    _fields;
    /**
     * Construct a composite propagator from a list of propagators.
     *
     * @param [config] Configuration object for composite propagator
     */
    constructor(config = {}) {
      this._propagators = config.propagators ?? [];
      this._fields = Array.from(new Set(this._propagators.map((p2) => typeof p2.fields === "function" ? p2.fields() : []).reduce((x2, y2) => x2.concat(y2), [])));
    }
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same carrier key, the propagator later in the list
     * will "win".
     *
     * @param context Context to inject
     * @param carrier Carrier into which context will be injected
     */
    inject(context2, carrier, setter) {
      for (const propagator of this._propagators) {
        try {
          propagator.inject(context2, carrier, setter);
        } catch (err) {
          diag2.warn(`Failed to inject with ${propagator.constructor.name}. Err: ${err.message}`);
        }
      }
    }
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same context key, the propagator later in the list
     * will "win".
     *
     * @param context Context to add values to
     * @param carrier Carrier from which to extract context
     */
    extract(context2, carrier, getter) {
      return this._propagators.reduce((ctx, propagator) => {
        try {
          return propagator.extract(ctx, carrier, getter);
        } catch (err) {
          diag2.warn(`Failed to extract with ${propagator.constructor.name}. Err: ${err.message}`);
        }
        return ctx;
      }, context2);
    }
    fields() {
      return this._fields.slice();
    }
  };

  // node_modules/@opentelemetry/core/build/esm/internal/validators.js
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
  var VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
  var VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
  var VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  var INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }

  // node_modules/@opentelemetry/core/build/esm/trace/TraceState.js
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  var TraceState = class _TraceState {
    _internalState = /* @__PURE__ */ new Map();
    constructor(rawTraceState) {
      if (rawTraceState)
        this._parse(rawTraceState);
    }
    set(key, value) {
      const traceState = this._clone();
      if (traceState._internalState.has(key)) {
        traceState._internalState.delete(key);
      }
      traceState._internalState.set(key, value);
      return traceState;
    }
    unset(key) {
      const traceState = this._clone();
      traceState._internalState.delete(key);
      return traceState;
    }
    get(key) {
      return this._internalState.get(key);
    }
    serialize() {
      return this._keys().reduce((agg, key) => {
        agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
        return agg;
      }, []).join(LIST_MEMBERS_SEPARATOR);
    }
    _parse(rawTraceState) {
      if (rawTraceState.length > MAX_TRACE_STATE_LEN)
        return;
      this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce((agg, part) => {
        const listMember = part.trim();
        const i2 = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
        if (i2 !== -1) {
          const key = listMember.slice(0, i2);
          const value = listMember.slice(i2 + 1, part.length);
          if (validateKey(key) && validateValue(value)) {
            agg.set(key, value);
          } else {
          }
        }
        return agg;
      }, /* @__PURE__ */ new Map());
      if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
        this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
      }
    }
    _keys() {
      return Array.from(this._internalState.keys()).reverse();
    }
    _clone() {
      const traceState = new _TraceState();
      traceState._internalState = new Map(this._internalState);
      return traceState;
    }
  };

  // node_modules/@opentelemetry/core/build/esm/trace/W3CTraceContextPropagator.js
  var TRACE_PARENT_HEADER = "traceparent";
  var TRACE_STATE_HEADER = "tracestate";
  var VERSION3 = "00";
  var VERSION_PART = "(?!ff)[\\da-f]{2}";
  var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
  var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
  var FLAGS_PART = "[\\da-f]{2}";
  var TRACE_PARENT_REGEX = new RegExp(`^\\s?(${VERSION_PART})-(${TRACE_ID_PART})-(${PARENT_ID_PART})-(${FLAGS_PART})(-.*)?\\s?$`);
  function parseTraceParent(traceParent) {
    const match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match)
      return null;
    if (match[1] === "00" && match[5])
      return null;
    return {
      traceId: match[2],
      spanId: match[3],
      traceFlags: parseInt(match[4], 16)
    };
  }
  var W3CTraceContextPropagator = class {
    inject(context2, carrier, setter) {
      const spanContext = trace.getSpanContext(context2);
      if (!spanContext || isTracingSuppressed(context2) || !isSpanContextValid(spanContext))
        return;
      const traceParent = `${VERSION3}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || TraceFlags.NONE).toString(16)}`;
      setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
      if (spanContext.traceState) {
        setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
      }
    }
    extract(context2, carrier, getter) {
      const traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
      if (!traceParentHeader)
        return context2;
      const traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
      if (typeof traceParent !== "string")
        return context2;
      const spanContext = parseTraceParent(traceParent);
      if (!spanContext)
        return context2;
      spanContext.isRemote = true;
      const traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
      if (traceStateHeader) {
        const state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
        spanContext.traceState = new TraceState(typeof state === "string" ? state : void 0);
      }
      return trace.setSpanContext(context2, spanContext);
    }
    fields() {
      return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
    }
  };

  // node_modules/@opentelemetry/core/build/esm/utils/lodash.merge.js
  var objectTag = "[object Object]";
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  var objectCtorString = funcToString.call(Object);
  var getPrototypeOf = Object.getPrototypeOf;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  var nativeObjectToString = objectProto.toString;
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) !== objectTag) {
      return false;
    }
    const proto = getPrototypeOf(value);
    if (proto === null) {
      return true;
    }
    const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
  }
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  function getRawTag(value) {
    const isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    let unmasked = false;
    try {
      value[symToStringTag] = void 0;
      unmasked = true;
    } catch {
    }
    const result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }

  // node_modules/@opentelemetry/core/build/esm/utils/merge.js
  var MAX_LEVEL = 20;
  function merge(...args) {
    let result = args.shift();
    const objects = /* @__PURE__ */ new WeakMap();
    while (args.length > 0) {
      result = mergeTwoObjects(result, args.shift(), 0, objects);
    }
    return result;
  }
  function takeValue(value) {
    if (isArray(value)) {
      return value.slice();
    }
    return value;
  }
  function mergeTwoObjects(one, two, level = 0, objects) {
    let result;
    if (level > MAX_LEVEL) {
      return void 0;
    }
    level++;
    if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) {
      result = takeValue(two);
    } else if (isArray(one)) {
      result = one.slice();
      if (isArray(two)) {
        for (let i2 = 0, j2 = two.length; i2 < j2; i2++) {
          result.push(takeValue(two[i2]));
        }
      } else if (isObject(two)) {
        const keys = Object.keys(two);
        for (let i2 = 0, j2 = keys.length; i2 < j2; i2++) {
          const key = keys[i2];
          result[key] = takeValue(two[key]);
        }
      }
    } else if (isObject(one)) {
      if (isObject(two)) {
        if (!shouldMerge(one, two)) {
          return two;
        }
        result = Object.assign({}, one);
        const keys = Object.keys(two);
        for (let i2 = 0, j2 = keys.length; i2 < j2; i2++) {
          const key = keys[i2];
          const twoValue = two[key];
          if (isPrimitive(twoValue)) {
            if (typeof twoValue === "undefined") {
              delete result[key];
            } else {
              result[key] = twoValue;
            }
          } else {
            const obj1 = result[key];
            const obj2 = twoValue;
            if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects)) {
              delete result[key];
            } else {
              if (isObject(obj1) && isObject(obj2)) {
                const arr1 = objects.get(obj1) || [];
                const arr2 = objects.get(obj2) || [];
                arr1.push({ obj: one, key });
                arr2.push({ obj: two, key });
                objects.set(obj1, arr1);
                objects.set(obj2, arr2);
              }
              result[key] = mergeTwoObjects(result[key], twoValue, level, objects);
            }
          }
        }
      } else {
        result = two;
      }
    }
    return result;
  }
  function wasObjectReferenced(obj, key, objects) {
    const arr = objects.get(obj[key]) || [];
    for (let i2 = 0, j2 = arr.length; i2 < j2; i2++) {
      const info = arr[i2];
      if (info.key === key && info.obj === obj) {
        return true;
      }
    }
    return false;
  }
  function isArray(value) {
    return Array.isArray(value);
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function isObject(value) {
    return !isPrimitive(value) && !isArray(value) && !isFunction(value) && typeof value === "object";
  }
  function isPrimitive(value) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined" || value instanceof Date || value instanceof RegExp || value === null;
  }
  function shouldMerge(one, two) {
    if (!isPlainObject(one) || !isPlainObject(two)) {
      return false;
    }
    return true;
  }

  // node_modules/@opentelemetry/core/build/esm/utils/timeout.js
  var TimeoutError = class _TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TimeoutError.prototype);
    }
  };
  function callWithTimeout(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
      timeoutHandle = setTimeout(function timeoutHandler() {
        reject(new TimeoutError("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    }, (reason) => {
      clearTimeout(timeoutHandle);
      throw reason;
    });
  }

  // node_modules/@opentelemetry/core/build/esm/utils/url.js
  function urlMatches(url, urlToMatch) {
    if (typeof urlToMatch === "string") {
      return url === urlToMatch;
    } else {
      return !!url.match(urlToMatch);
    }
  }
  function isUrlIgnored(url, ignoredUrls) {
    if (!ignoredUrls) {
      return false;
    }
    for (const ignoreUrl of ignoredUrls) {
      if (urlMatches(url, ignoreUrl)) {
        return true;
      }
    }
    return false;
  }

  // node_modules/@opentelemetry/core/build/esm/utils/promise.js
  var Deferred = class {
    _promise;
    _resolve;
    _reject;
    constructor() {
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
    get promise() {
      return this._promise;
    }
    resolve(val) {
      this._resolve(val);
    }
    reject(err) {
      this._reject(err);
    }
  };

  // node_modules/@opentelemetry/core/build/esm/utils/callback.js
  var BindOnceFuture = class {
    _callback;
    _that;
    _isCalled = false;
    _deferred = new Deferred();
    constructor(_callback, _that) {
      this._callback = _callback;
      this._that = _that;
    }
    get isCalled() {
      return this._isCalled;
    }
    get promise() {
      return this._deferred.promise;
    }
    call(...args) {
      if (!this._isCalled) {
        this._isCalled = true;
        try {
          Promise.resolve(this._callback.call(this._that, ...args)).then((val) => this._deferred.resolve(val), (err) => this._deferred.reject(err));
        } catch (err) {
          this._deferred.reject(err);
        }
      }
      return this._deferred.promise;
    }
  };

  // node_modules/@opentelemetry/core/build/esm/internal/exporter.js
  function _export(exporter, arg) {
    return new Promise((resolve) => {
      context.with(suppressTracing(context.active()), () => {
        exporter.export(arg, (result) => {
          resolve(result);
        });
      });
    });
  }

  // node_modules/@opentelemetry/core/build/esm/index.js
  var internal = {
    _export
  };

  // node_modules/@opentelemetry/resources/build/esm/platform/browser/default-service-name.js
  function defaultServiceName() {
    return "unknown_service";
  }

  // node_modules/@opentelemetry/resources/build/esm/utils.js
  var isPromiseLike = (val) => {
    return val !== null && typeof val === "object" && typeof val.then === "function";
  };

  // node_modules/@opentelemetry/resources/build/esm/ResourceImpl.js
  var ResourceImpl = class _ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _schemaUrl;
    _memoizedAttributes;
    static FromAttributeList(attributes, options) {
      const res = new _ResourceImpl({}, options);
      res._rawAttributes = guardedRawAttributes(attributes);
      res._asyncAttributesPending = attributes.filter(([_2, val]) => isPromiseLike(val)).length > 0;
      return res;
    }
    constructor(resource, options) {
      const attributes = resource.attributes ?? {};
      this._rawAttributes = Object.entries(attributes).map(([k2, v2]) => {
        if (isPromiseLike(v2)) {
          this._asyncAttributesPending = true;
        }
        return [k2, v2];
      });
      this._rawAttributes = guardedRawAttributes(this._rawAttributes);
      this._schemaUrl = validateSchemaUrl(options?.schemaUrl);
    }
    get asyncAttributesPending() {
      return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
      if (!this.asyncAttributesPending) {
        return;
      }
      for (let i2 = 0; i2 < this._rawAttributes.length; i2++) {
        const [k2, v2] = this._rawAttributes[i2];
        this._rawAttributes[i2] = [k2, isPromiseLike(v2) ? await v2 : v2];
      }
      this._asyncAttributesPending = false;
    }
    get attributes() {
      if (this.asyncAttributesPending) {
        diag2.error("Accessing resource attributes before async attributes settled");
      }
      if (this._memoizedAttributes) {
        return this._memoizedAttributes;
      }
      const attrs = {};
      for (const [k2, v2] of this._rawAttributes) {
        if (isPromiseLike(v2)) {
          diag2.debug(`Unsettled resource attribute ${k2} skipped`);
          continue;
        }
        if (v2 != null) {
          attrs[k2] ??= v2;
        }
      }
      if (!this._asyncAttributesPending) {
        this._memoizedAttributes = attrs;
      }
      return attrs;
    }
    getRawAttributes() {
      return this._rawAttributes;
    }
    get schemaUrl() {
      return this._schemaUrl;
    }
    merge(resource) {
      if (resource == null)
        return this;
      const mergedSchemaUrl = mergeSchemaUrl(this, resource);
      const mergedOptions = mergedSchemaUrl ? { schemaUrl: mergedSchemaUrl } : void 0;
      return _ResourceImpl.FromAttributeList([...resource.getRawAttributes(), ...this.getRawAttributes()], mergedOptions);
    }
  };
  function resourceFromAttributes(attributes, options) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes), options);
  }
  function resourceFromDetectedResource(detectedResource, options) {
    return new ResourceImpl(detectedResource, options);
  }
  function emptyResource() {
    return resourceFromAttributes({});
  }
  function defaultResource() {
    return resourceFromAttributes({
      [ATTR_SERVICE_NAME]: defaultServiceName(),
      [ATTR_TELEMETRY_SDK_LANGUAGE]: SDK_INFO[ATTR_TELEMETRY_SDK_LANGUAGE],
      [ATTR_TELEMETRY_SDK_NAME]: SDK_INFO[ATTR_TELEMETRY_SDK_NAME],
      [ATTR_TELEMETRY_SDK_VERSION]: SDK_INFO[ATTR_TELEMETRY_SDK_VERSION]
    });
  }
  function guardedRawAttributes(attributes) {
    return attributes.map(([k2, v2]) => {
      if (isPromiseLike(v2)) {
        return [
          k2,
          v2.catch((err) => {
            diag2.debug("promise rejection for resource attribute: %s - %s", k2, err);
            return void 0;
          })
        ];
      }
      return [k2, v2];
    });
  }
  function validateSchemaUrl(schemaUrl) {
    if (typeof schemaUrl === "string" || schemaUrl === void 0) {
      return schemaUrl;
    }
    diag2.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.", schemaUrl);
    return void 0;
  }
  function mergeSchemaUrl(old, updating) {
    const oldSchemaUrl = old?.schemaUrl;
    const updatingSchemaUrl = updating?.schemaUrl;
    const isOldEmpty = oldSchemaUrl === void 0 || oldSchemaUrl === "";
    const isUpdatingEmpty = updatingSchemaUrl === void 0 || updatingSchemaUrl === "";
    if (isOldEmpty) {
      return updatingSchemaUrl;
    }
    if (isUpdatingEmpty) {
      return oldSchemaUrl;
    }
    if (oldSchemaUrl === updatingSchemaUrl) {
      return oldSchemaUrl;
    }
    diag2.warn('Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.', oldSchemaUrl, updatingSchemaUrl);
    return void 0;
  }

  // node_modules/@opentelemetry/resources/build/esm/detect-resources.js
  var detectResources = (config = {}) => {
    const resources = (config.detectors || []).map((d2) => {
      try {
        const resource = resourceFromDetectedResource(d2.detect(config));
        diag2.debug(`${d2.constructor.name} found resource.`, resource);
        return resource;
      } catch (e2) {
        diag2.debug(`${d2.constructor.name} failed: ${e2.message}`);
        return emptyResource();
      }
    });
    return resources.reduce((acc, resource) => acc.merge(resource), emptyResource());
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/enums.js
  var ExceptionEventName = "exception";

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Span.js
  var SpanImpl = class {
    // Below properties are included to implement ReadableSpan for export
    // purposes but are not intended to be written-to directly.
    _spanContext;
    kind;
    parentSpanContext;
    attributes = {};
    links = [];
    events = [];
    startTime;
    resource;
    instrumentationScope;
    _droppedAttributesCount = 0;
    _droppedEventsCount = 0;
    _droppedLinksCount = 0;
    name;
    status = {
      code: SpanStatusCode.UNSET
    };
    endTime = [0, 0];
    _ended = false;
    _duration = [-1, -1];
    _spanProcessor;
    _spanLimits;
    _attributeValueLengthLimit;
    _performanceStartTime;
    _performanceOffset;
    _startTimeProvided;
    /**
     * Constructs a new SpanImpl instance.
     */
    constructor(opts) {
      const now = Date.now();
      this._spanContext = opts.spanContext;
      this._performanceStartTime = otperformance.now();
      this._performanceOffset = now - (this._performanceStartTime + getTimeOrigin());
      this._startTimeProvided = opts.startTime != null;
      this._spanLimits = opts.spanLimits;
      this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
      this._spanProcessor = opts.spanProcessor;
      this.name = opts.name;
      this.parentSpanContext = opts.parentSpanContext;
      this.kind = opts.kind;
      this.links = opts.links || [];
      this.startTime = this._getTime(opts.startTime ?? now);
      this.resource = opts.resource;
      this.instrumentationScope = opts.scope;
      if (opts.attributes != null) {
        this.setAttributes(opts.attributes);
      }
      this._spanProcessor.onStart(this, opts.context);
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(key, value) {
      if (value == null || this._isSpanEnded())
        return this;
      if (key.length === 0) {
        diag2.warn(`Invalid attribute key: ${key}`);
        return this;
      }
      if (!isAttributeValue(value)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        return this;
      }
      const { attributeCountLimit } = this._spanLimits;
      if (attributeCountLimit !== void 0 && Object.keys(this.attributes).length >= attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
        this._droppedAttributesCount++;
        return this;
      }
      this.attributes[key] = this._truncateToSize(value);
      return this;
    }
    setAttributes(attributes) {
      for (const [k2, v2] of Object.entries(attributes)) {
        this.setAttribute(k2, v2);
      }
      return this;
    }
    /**
     *
     * @param name Span Name
     * @param [attributesOrStartTime] Span attributes or start time
     *     if type is {@type TimeInput} and 3rd param is undefined
     * @param [timeStamp] Specified time stamp for the event
     */
    addEvent(name, attributesOrStartTime, timeStamp) {
      if (this._isSpanEnded())
        return this;
      const { eventCountLimit } = this._spanLimits;
      if (eventCountLimit === 0) {
        diag2.warn("No events allowed.");
        this._droppedEventsCount++;
        return this;
      }
      if (eventCountLimit !== void 0 && this.events.length >= eventCountLimit) {
        if (this._droppedEventsCount === 0) {
          diag2.debug("Dropping extra events.");
        }
        this.events.shift();
        this._droppedEventsCount++;
      }
      if (isTimeInput(attributesOrStartTime)) {
        if (!isTimeInput(timeStamp)) {
          timeStamp = attributesOrStartTime;
        }
        attributesOrStartTime = void 0;
      }
      const attributes = sanitizeAttributes(attributesOrStartTime);
      this.events.push({
        name,
        attributes,
        time: this._getTime(timeStamp),
        droppedAttributesCount: 0
      });
      return this;
    }
    addLink(link) {
      this.links.push(link);
      return this;
    }
    addLinks(links) {
      this.links.push(...links);
      return this;
    }
    setStatus(status) {
      if (this._isSpanEnded())
        return this;
      this.status = { ...status };
      if (this.status.message != null && typeof status.message !== "string") {
        diag2.warn(`Dropping invalid status.message of type '${typeof status.message}', expected 'string'`);
        delete this.status.message;
      }
      return this;
    }
    updateName(name) {
      if (this._isSpanEnded())
        return this;
      this.name = name;
      return this;
    }
    end(endTime) {
      if (this._isSpanEnded()) {
        diag2.error(`${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`);
        return;
      }
      this._ended = true;
      this.endTime = this._getTime(endTime);
      this._duration = hrTimeDuration(this.startTime, this.endTime);
      if (this._duration[0] < 0) {
        diag2.warn("Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.", this.startTime, this.endTime);
        this.endTime = this.startTime.slice();
        this._duration = [0, 0];
      }
      if (this._droppedEventsCount > 0) {
        diag2.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
      }
      this._spanProcessor.onEnd(this);
    }
    _getTime(inp) {
      if (typeof inp === "number" && inp <= otperformance.now()) {
        return hrTime(inp + this._performanceOffset);
      }
      if (typeof inp === "number") {
        return millisToHrTime(inp);
      }
      if (inp instanceof Date) {
        return millisToHrTime(inp.getTime());
      }
      if (isTimeInputHrTime(inp)) {
        return inp;
      }
      if (this._startTimeProvided) {
        return millisToHrTime(Date.now());
      }
      const msDuration = otperformance.now() - this._performanceStartTime;
      return addHrTimes(this.startTime, millisToHrTime(msDuration));
    }
    isRecording() {
      return this._ended === false;
    }
    recordException(exception, time) {
      const attributes = {};
      if (typeof exception === "string") {
        attributes[ATTR_EXCEPTION_MESSAGE] = exception;
      } else if (exception) {
        if (exception.code) {
          attributes[ATTR_EXCEPTION_TYPE] = exception.code.toString();
        } else if (exception.name) {
          attributes[ATTR_EXCEPTION_TYPE] = exception.name;
        }
        if (exception.message) {
          attributes[ATTR_EXCEPTION_MESSAGE] = exception.message;
        }
        if (exception.stack) {
          attributes[ATTR_EXCEPTION_STACKTRACE] = exception.stack;
        }
      }
      if (attributes[ATTR_EXCEPTION_TYPE] || attributes[ATTR_EXCEPTION_MESSAGE]) {
        this.addEvent(ExceptionEventName, attributes, time);
      } else {
        diag2.warn(`Failed to record an exception ${exception}`);
      }
    }
    get duration() {
      return this._duration;
    }
    get ended() {
      return this._ended;
    }
    get droppedAttributesCount() {
      return this._droppedAttributesCount;
    }
    get droppedEventsCount() {
      return this._droppedEventsCount;
    }
    get droppedLinksCount() {
      return this._droppedLinksCount;
    }
    _isSpanEnded() {
      if (this._ended) {
        const error = new Error(`Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`);
        diag2.warn(`Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`, error);
      }
      return this._ended;
    }
    // Utility function to truncate given value within size
    // for value type of string, will truncate to given limit
    // for type of non-string, will return same value
    _truncateToLimitUtil(value, limit) {
      if (value.length <= limit) {
        return value;
      }
      return value.substring(0, limit);
    }
    /**
     * If the given attribute value is of type string and has more characters than given {@code attributeValueLengthLimit} then
     * return string with truncated to {@code attributeValueLengthLimit} characters
     *
     * If the given attribute value is array of strings then
     * return new array of strings with each element truncated to {@code attributeValueLengthLimit} characters
     *
     * Otherwise return same Attribute {@code value}
     *
     * @param value Attribute value
     * @returns truncated attribute value if required, otherwise same value
     */
    _truncateToSize(value) {
      const limit = this._attributeValueLengthLimit;
      if (limit <= 0) {
        diag2.warn(`Attribute value limit must be positive, got ${limit}`);
        return value;
      }
      if (typeof value === "string") {
        return this._truncateToLimitUtil(value, limit);
      }
      if (Array.isArray(value)) {
        return value.map((val) => typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val);
      }
      return value;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Sampler.js
  var SamplingDecision2;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision2 || (SamplingDecision2 = {}));

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOffSampler.js
  var AlwaysOffSampler = class {
    shouldSample() {
      return {
        decision: SamplingDecision2.NOT_RECORD
      };
    }
    toString() {
      return "AlwaysOffSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
  var AlwaysOnSampler = class {
    shouldSample() {
      return {
        decision: SamplingDecision2.RECORD_AND_SAMPLED
      };
    }
    toString() {
      return "AlwaysOnSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/ParentBasedSampler.js
  var ParentBasedSampler = class {
    _root;
    _remoteParentSampled;
    _remoteParentNotSampled;
    _localParentSampled;
    _localParentNotSampled;
    constructor(config) {
      this._root = config.root;
      if (!this._root) {
        globalErrorHandler(new Error("ParentBasedSampler must have a root sampler configured"));
        this._root = new AlwaysOnSampler();
      }
      this._remoteParentSampled = config.remoteParentSampled ?? new AlwaysOnSampler();
      this._remoteParentNotSampled = config.remoteParentNotSampled ?? new AlwaysOffSampler();
      this._localParentSampled = config.localParentSampled ?? new AlwaysOnSampler();
      this._localParentNotSampled = config.localParentNotSampled ?? new AlwaysOffSampler();
    }
    shouldSample(context2, traceId, spanName, spanKind, attributes, links) {
      const parentContext = trace.getSpanContext(context2);
      if (!parentContext || !isSpanContextValid(parentContext)) {
        return this._root.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      if (parentContext.isRemote) {
        if (parentContext.traceFlags & TraceFlags.SAMPLED) {
          return this._remoteParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        return this._remoteParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      if (parentContext.traceFlags & TraceFlags.SAMPLED) {
        return this._localParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      return this._localParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
    }
    toString() {
      return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/TraceIdRatioBasedSampler.js
  var TraceIdRatioBasedSampler = class {
    _ratio;
    _upperBound;
    constructor(_ratio = 0) {
      this._ratio = _ratio;
      this._ratio = this._normalize(_ratio);
      this._upperBound = Math.floor(this._ratio * 4294967295);
    }
    shouldSample(context2, traceId) {
      return {
        decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound ? SamplingDecision2.RECORD_AND_SAMPLED : SamplingDecision2.NOT_RECORD
      };
    }
    toString() {
      return `TraceIdRatioBased{${this._ratio}}`;
    }
    _normalize(ratio) {
      if (typeof ratio !== "number" || isNaN(ratio))
        return 0;
      return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
    }
    _accumulate(traceId) {
      let accumulation = 0;
      for (let i2 = 0; i2 < traceId.length / 8; i2++) {
        const pos = i2 * 8;
        const part = parseInt(traceId.slice(pos, pos + 8), 16);
        accumulation = (accumulation ^ part) >>> 0;
      }
      return accumulation;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/config.js
  var TracesSamplerValues;
  (function(TracesSamplerValues2) {
    TracesSamplerValues2["AlwaysOff"] = "always_off";
    TracesSamplerValues2["AlwaysOn"] = "always_on";
    TracesSamplerValues2["ParentBasedAlwaysOff"] = "parentbased_always_off";
    TracesSamplerValues2["ParentBasedAlwaysOn"] = "parentbased_always_on";
    TracesSamplerValues2["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
    TracesSamplerValues2["TraceIdRatio"] = "traceidratio";
  })(TracesSamplerValues || (TracesSamplerValues = {}));
  var DEFAULT_RATIO = 1;
  function loadDefaultConfig() {
    return {
      sampler: buildSamplerFromEnv(),
      forceFlushTimeoutMillis: 3e4,
      generalLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128
      },
      spanLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? 128,
        linkCountLimit: getNumberFromEnv("OTEL_SPAN_LINK_COUNT_LIMIT") ?? 128,
        eventCountLimit: getNumberFromEnv("OTEL_SPAN_EVENT_COUNT_LIMIT") ?? 128,
        attributePerEventCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT") ?? 128,
        attributePerLinkCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT") ?? 128
      }
    };
  }
  function buildSamplerFromEnv() {
    const sampler = getStringFromEnv("OTEL_TRACES_SAMPLER") ?? TracesSamplerValues.ParentBasedAlwaysOn;
    switch (sampler) {
      case TracesSamplerValues.AlwaysOn:
        return new AlwaysOnSampler();
      case TracesSamplerValues.AlwaysOff:
        return new AlwaysOffSampler();
      case TracesSamplerValues.ParentBasedAlwaysOn:
        return new ParentBasedSampler({
          root: new AlwaysOnSampler()
        });
      case TracesSamplerValues.ParentBasedAlwaysOff:
        return new ParentBasedSampler({
          root: new AlwaysOffSampler()
        });
      case TracesSamplerValues.TraceIdRatio:
        return new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv());
      case TracesSamplerValues.ParentBasedTraceIdRatio:
        return new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv())
        });
      default:
        diag2.error(`OTEL_TRACES_SAMPLER value "${sampler}" invalid, defaulting to "${TracesSamplerValues.ParentBasedAlwaysOn}".`);
        return new ParentBasedSampler({
          root: new AlwaysOnSampler()
        });
    }
  }
  function getSamplerProbabilityFromEnv() {
    const probability = getNumberFromEnv("OTEL_TRACES_SAMPLER_ARG");
    if (probability == null) {
      diag2.error(`OTEL_TRACES_SAMPLER_ARG is blank, defaulting to ${DEFAULT_RATIO}.`);
      return DEFAULT_RATIO;
    }
    if (probability < 0 || probability > 1) {
      diag2.error(`OTEL_TRACES_SAMPLER_ARG=${probability} was given, but it is out of range ([0..1]), defaulting to ${DEFAULT_RATIO}.`);
      return DEFAULT_RATIO;
    }
    return probability;
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/utility.js
  var DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
  var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
  function mergeConfig(userConfig) {
    const perInstanceDefaults = {
      sampler: buildSamplerFromEnv()
    };
    const DEFAULT_CONFIG = loadDefaultConfig();
    const target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
    target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
    target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
    return target;
  }
  function reconfigureLimits(userConfig) {
    const spanLimits = Object.assign({}, userConfig.spanLimits);
    spanLimits.attributeCountLimit = userConfig.spanLimits?.attributeCountLimit ?? userConfig.generalLimits?.attributeCountLimit ?? getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? DEFAULT_ATTRIBUTE_COUNT_LIMIT;
    spanLimits.attributeValueLengthLimit = userConfig.spanLimits?.attributeValueLengthLimit ?? userConfig.generalLimits?.attributeValueLengthLimit ?? getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
    return Object.assign({}, userConfig, { spanLimits });
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/export/BatchSpanProcessorBase.js
  var BatchSpanProcessorBase = class {
    _exporter;
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _isExporting = false;
    _finishedSpans = [];
    _timer;
    _shutdownOnce;
    _droppedSpansCount = 0;
    constructor(_exporter, config) {
      this._exporter = _exporter;
      this._maxExportBatchSize = typeof config?.maxExportBatchSize === "number" ? config.maxExportBatchSize : getNumberFromEnv("OTEL_BSP_MAX_EXPORT_BATCH_SIZE") ?? 512;
      this._maxQueueSize = typeof config?.maxQueueSize === "number" ? config.maxQueueSize : getNumberFromEnv("OTEL_BSP_MAX_QUEUE_SIZE") ?? 2048;
      this._scheduledDelayMillis = typeof config?.scheduledDelayMillis === "number" ? config.scheduledDelayMillis : getNumberFromEnv("OTEL_BSP_SCHEDULE_DELAY") ?? 5e3;
      this._exportTimeoutMillis = typeof config?.exportTimeoutMillis === "number" ? config.exportTimeoutMillis : getNumberFromEnv("OTEL_BSP_EXPORT_TIMEOUT") ?? 3e4;
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
      if (this._maxExportBatchSize > this._maxQueueSize) {
        diag2.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
        this._maxExportBatchSize = this._maxQueueSize;
      }
    }
    forceFlush() {
      if (this._shutdownOnce.isCalled) {
        return this._shutdownOnce.promise;
      }
      return this._flushAll();
    }
    // does nothing.
    onStart(_span, _parentContext) {
    }
    onEnd(span) {
      if (this._shutdownOnce.isCalled) {
        return;
      }
      if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
        return;
      }
      this._addToBuffer(span);
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return Promise.resolve().then(() => {
        return this.onShutdown();
      }).then(() => {
        return this._flushAll();
      }).then(() => {
        return this._exporter.shutdown();
      });
    }
    /** Add a span in the buffer. */
    _addToBuffer(span) {
      if (this._finishedSpans.length >= this._maxQueueSize) {
        if (this._droppedSpansCount === 0) {
          diag2.debug("maxQueueSize reached, dropping spans");
        }
        this._droppedSpansCount++;
        return;
      }
      if (this._droppedSpansCount > 0) {
        diag2.warn(`Dropped ${this._droppedSpansCount} spans because maxQueueSize reached`);
        this._droppedSpansCount = 0;
      }
      this._finishedSpans.push(span);
      this._maybeStartTimer();
    }
    /**
     * Send all spans to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    _flushAll() {
      return new Promise((resolve, reject) => {
        const promises = [];
        const count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
        for (let i2 = 0, j2 = count; i2 < j2; i2++) {
          promises.push(this._flushOneBatch());
        }
        Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    _flushOneBatch() {
      this._clearTimer();
      if (this._finishedSpans.length === 0) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Timeout"));
        }, this._exportTimeoutMillis);
        context.with(suppressTracing(context.active()), () => {
          let spans;
          if (this._finishedSpans.length <= this._maxExportBatchSize) {
            spans = this._finishedSpans;
            this._finishedSpans = [];
          } else {
            spans = this._finishedSpans.splice(0, this._maxExportBatchSize);
          }
          const doExport = () => this._exporter.export(spans, (result) => {
            clearTimeout(timer);
            if (result.code === ExportResultCode.SUCCESS) {
              resolve();
            } else {
              reject(result.error ?? new Error("BatchSpanProcessor: span export failed"));
            }
          });
          let pendingResources = null;
          for (let i2 = 0, len = spans.length; i2 < len; i2++) {
            const span = spans[i2];
            if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
              pendingResources ??= [];
              pendingResources.push(span.resource.waitForAsyncAttributes());
            }
          }
          if (pendingResources === null) {
            doExport();
          } else {
            Promise.all(pendingResources).then(doExport, (err) => {
              globalErrorHandler(err);
              reject(err);
            });
          }
        });
      });
    }
    _maybeStartTimer() {
      if (this._isExporting)
        return;
      const flush = () => {
        this._isExporting = true;
        this._flushOneBatch().finally(() => {
          this._isExporting = false;
          if (this._finishedSpans.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        }).catch((e2) => {
          this._isExporting = false;
          globalErrorHandler(e2);
        });
      };
      if (this._finishedSpans.length >= this._maxExportBatchSize) {
        return flush();
      }
      if (this._timer !== void 0)
        return;
      this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
      unrefTimer(this._timer);
    }
    _clearTimer() {
      if (this._timer !== void 0) {
        clearTimeout(this._timer);
        this._timer = void 0;
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/export/BatchSpanProcessor.js
  var BatchSpanProcessor = class extends BatchSpanProcessorBase {
    _visibilityChangeListener;
    _pageHideListener;
    constructor(_exporter, config) {
      super(_exporter, config);
      this.onInit(config);
    }
    onInit(config) {
      if (config?.disableAutoFlushOnDocumentHide !== true && typeof document !== "undefined") {
        this._visibilityChangeListener = () => {
          if (document.visibilityState === "hidden") {
            this.forceFlush().catch((error) => {
              globalErrorHandler(error);
            });
          }
        };
        this._pageHideListener = () => {
          this.forceFlush().catch((error) => {
            globalErrorHandler(error);
          });
        };
        document.addEventListener("visibilitychange", this._visibilityChangeListener);
        document.addEventListener("pagehide", this._pageHideListener);
      }
    }
    onShutdown() {
      if (typeof document !== "undefined") {
        if (this._visibilityChangeListener) {
          document.removeEventListener("visibilitychange", this._visibilityChangeListener);
        }
        if (this._pageHideListener) {
          document.removeEventListener("pagehide", this._pageHideListener);
        }
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/RandomIdGenerator.js
  var SPAN_ID_BYTES = 8;
  var TRACE_ID_BYTES = 16;
  var RandomIdGenerator = class {
    /**
     * Returns a random 16-byte trace ID formatted/encoded as a 32 lowercase hex
     * characters corresponding to 128 bits.
     */
    generateTraceId = getIdGenerator(TRACE_ID_BYTES);
    /**
     * Returns a random 8-byte span ID formatted/encoded as a 16 lowercase hex
     * characters corresponding to 64 bits.
     */
    generateSpanId = getIdGenerator(SPAN_ID_BYTES);
  };
  var SHARED_CHAR_CODES_ARRAY = Array(32);
  function getIdGenerator(bytes) {
    return function generateId() {
      for (let i2 = 0; i2 < bytes * 2; i2++) {
        SHARED_CHAR_CODES_ARRAY[i2] = Math.floor(Math.random() * 16) + 48;
        if (SHARED_CHAR_CODES_ARRAY[i2] >= 58) {
          SHARED_CHAR_CODES_ARRAY[i2] += 39;
        }
      }
      return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
    };
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Tracer.js
  var Tracer = class {
    _sampler;
    _generalLimits;
    _spanLimits;
    _idGenerator;
    instrumentationScope;
    _resource;
    _spanProcessor;
    /**
     * Constructs a new Tracer instance.
     */
    constructor(instrumentationScope, config, resource, spanProcessor) {
      const localConfig = mergeConfig(config);
      this._sampler = localConfig.sampler;
      this._generalLimits = localConfig.generalLimits;
      this._spanLimits = localConfig.spanLimits;
      this._idGenerator = config.idGenerator || new RandomIdGenerator();
      this._resource = resource;
      this._spanProcessor = spanProcessor;
      this.instrumentationScope = instrumentationScope;
    }
    /**
     * Starts a new Span or returns the default NoopSpan based on the sampling
     * decision.
     */
    startSpan(name, options = {}, context2 = context.active()) {
      if (options.root) {
        context2 = trace.deleteSpan(context2);
      }
      const parentSpan = trace.getSpan(context2);
      if (isTracingSuppressed(context2)) {
        diag2.debug("Instrumentation suppressed, returning Noop Span");
        const nonRecordingSpan = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
        return nonRecordingSpan;
      }
      const parentSpanContext = parentSpan?.spanContext();
      const spanId = this._idGenerator.generateSpanId();
      let validParentSpanContext;
      let traceId;
      let traceState;
      if (!parentSpanContext || !trace.isSpanContextValid(parentSpanContext)) {
        traceId = this._idGenerator.generateTraceId();
      } else {
        traceId = parentSpanContext.traceId;
        traceState = parentSpanContext.traceState;
        validParentSpanContext = parentSpanContext;
      }
      const spanKind = options.kind ?? SpanKind.INTERNAL;
      const links = (options.links ?? []).map((link) => {
        return {
          context: link.context,
          attributes: sanitizeAttributes(link.attributes)
        };
      });
      const attributes = sanitizeAttributes(options.attributes);
      const samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
      traceState = samplingResult.traceState ?? traceState;
      const traceFlags = samplingResult.decision === SamplingDecision.RECORD_AND_SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE;
      const spanContext = { traceId, spanId, traceFlags, traceState };
      if (samplingResult.decision === SamplingDecision.NOT_RECORD) {
        diag2.debug("Recording is off, propagating context in a non-recording span");
        const nonRecordingSpan = trace.wrapSpanContext(spanContext);
        return nonRecordingSpan;
      }
      const initAttributes = sanitizeAttributes(Object.assign(attributes, samplingResult.attributes));
      const span = new SpanImpl({
        resource: this._resource,
        scope: this.instrumentationScope,
        context: context2,
        spanContext,
        name,
        kind: spanKind,
        links,
        parentSpanContext: validParentSpanContext,
        attributes: initAttributes,
        startTime: options.startTime,
        spanProcessor: this._spanProcessor,
        spanLimits: this._spanLimits
      });
      return span;
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = ctx ?? context.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = trace.setSpan(parentContext, span);
      return context.with(contextWithSpanSet, fn, void 0, span);
    }
    /** Returns the active {@link GeneralLimits}. */
    getGeneralLimits() {
      return this._generalLimits;
    }
    /** Returns the active {@link SpanLimits}. */
    getSpanLimits() {
      return this._spanLimits;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/MultiSpanProcessor.js
  var MultiSpanProcessor = class {
    _spanProcessors;
    constructor(_spanProcessors) {
      this._spanProcessors = _spanProcessors;
    }
    forceFlush() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) {
        promises.push(spanProcessor.forceFlush());
      }
      return new Promise((resolve) => {
        Promise.all(promises).then(() => {
          resolve();
        }).catch((error) => {
          globalErrorHandler(error || new Error("MultiSpanProcessor: forceFlush failed"));
          resolve();
        });
      });
    }
    onStart(span, context2) {
      for (const spanProcessor of this._spanProcessors) {
        spanProcessor.onStart(span, context2);
      }
    }
    onEnd(span) {
      for (const spanProcessor of this._spanProcessors) {
        spanProcessor.onEnd(span);
      }
    }
    shutdown() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) {
        promises.push(spanProcessor.shutdown());
      }
      return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => {
          resolve();
        }, reject);
      });
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/BasicTracerProvider.js
  var ForceFlushState;
  (function(ForceFlushState2) {
    ForceFlushState2[ForceFlushState2["resolved"] = 0] = "resolved";
    ForceFlushState2[ForceFlushState2["timeout"] = 1] = "timeout";
    ForceFlushState2[ForceFlushState2["error"] = 2] = "error";
    ForceFlushState2[ForceFlushState2["unresolved"] = 3] = "unresolved";
  })(ForceFlushState || (ForceFlushState = {}));
  var BasicTracerProvider = class {
    _config;
    _tracers = /* @__PURE__ */ new Map();
    _resource;
    _activeSpanProcessor;
    constructor(config = {}) {
      const mergedConfig = merge({}, loadDefaultConfig(), reconfigureLimits(config));
      this._resource = mergedConfig.resource ?? defaultResource();
      this._config = Object.assign({}, mergedConfig, {
        resource: this._resource
      });
      const spanProcessors = [];
      if (config.spanProcessors?.length) {
        spanProcessors.push(...config.spanProcessors);
      }
      this._activeSpanProcessor = new MultiSpanProcessor(spanProcessors);
    }
    getTracer(name, version, options) {
      const key = `${name}@${version || ""}:${options?.schemaUrl || ""}`;
      if (!this._tracers.has(key)) {
        this._tracers.set(key, new Tracer({ name, version, schemaUrl: options?.schemaUrl }, this._config, this._resource, this._activeSpanProcessor));
      }
      return this._tracers.get(key);
    }
    forceFlush() {
      const timeout = this._config.forceFlushTimeoutMillis;
      const promises = this._activeSpanProcessor["_spanProcessors"].map((spanProcessor) => {
        return new Promise((resolve) => {
          let state;
          const timeoutInterval = setTimeout(() => {
            resolve(new Error(`Span processor did not completed within timeout period of ${timeout} ms`));
            state = ForceFlushState.timeout;
          }, timeout);
          spanProcessor.forceFlush().then(() => {
            clearTimeout(timeoutInterval);
            if (state !== ForceFlushState.timeout) {
              state = ForceFlushState.resolved;
              resolve(state);
            }
          }).catch((error) => {
            clearTimeout(timeoutInterval);
            state = ForceFlushState.error;
            resolve(error);
          });
        });
      });
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((results) => {
          const errors = results.filter((result) => result !== ForceFlushState.resolved);
          if (errors.length > 0) {
            reject(errors);
          } else {
            resolve();
          }
        }).catch((error) => reject([error]));
      });
    }
    shutdown() {
      return this._activeSpanProcessor.shutdown();
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/StackContextManager.js
  var StackContextManager = class {
    /**
     * whether the context manager is enabled or not
     */
    _enabled = false;
    /**
     * Keeps the reference to current context
     */
    _currentContext = ROOT_CONTEXT;
    /**
     *
     * @param context
     * @param target Function to be executed within the context
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    _bindFunction(context2 = ROOT_CONTEXT, target) {
      const manager = this;
      const contextWrapper = function(...args) {
        return manager.with(context2, () => target.apply(this, args));
      };
      Object.defineProperty(contextWrapper, "length", {
        enumerable: false,
        configurable: true,
        writable: false,
        value: target.length
      });
      return contextWrapper;
    }
    /**
     * Returns the active context
     */
    active() {
      return this._currentContext;
    }
    /**
     * Binds a the certain context or the active one to the target function and then returns the target
     * @param context A context (span) to be bind to target
     * @param target a function or event emitter. When target or one of its callbacks is called,
     *  the provided context will be used as the active context for the duration of the call.
     */
    bind(context2, target) {
      if (context2 === void 0) {
        context2 = this.active();
      }
      if (typeof target === "function") {
        return this._bindFunction(context2, target);
      }
      return target;
    }
    /**
     * Disable the context manager (clears the current context)
     */
    disable() {
      this._currentContext = ROOT_CONTEXT;
      this._enabled = false;
      return this;
    }
    /**
     * Enables the context manager and creates a default(root) context
     */
    enable() {
      if (this._enabled) {
        return this;
      }
      this._enabled = true;
      this._currentContext = ROOT_CONTEXT;
      return this;
    }
    /**
     * Calls the callback function [fn] with the provided [context]. If [context] is undefined then it will use the window.
     * The context will be set as active
     * @param context
     * @param fn Callback function
     * @param thisArg optional receiver to be used for calling fn
     * @param args optional arguments forwarded to fn
     */
    with(context2, fn, thisArg, ...args) {
      const previousContext = this._currentContext;
      this._currentContext = context2 || ROOT_CONTEXT;
      try {
        return fn.call(thisArg, ...args);
      } finally {
        this._currentContext = previousContext;
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/WebTracerProvider.js
  function setupContextManager(contextManager) {
    if (contextManager === null) {
      return;
    }
    if (contextManager === void 0) {
      const defaultContextManager = new StackContextManager();
      defaultContextManager.enable();
      context.setGlobalContextManager(defaultContextManager);
      return;
    }
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
  }
  function setupPropagator(propagator) {
    if (propagator === null) {
      return;
    }
    if (propagator === void 0) {
      propagation.setGlobalPropagator(new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator()
        ]
      }));
      return;
    }
    propagation.setGlobalPropagator(propagator);
  }
  var WebTracerProvider = class extends BasicTracerProvider {
    /**
     * Constructs a new Tracer instance.
     * @param config Web Tracer config
     */
    constructor(config = {}) {
      super(config);
    }
    /**
     * Register this TracerProvider for use with the OpenTelemetry API.
     * Undefined values may be replaced with defaults, and
     * null values will be skipped.
     *
     * @param config Configuration object for SDK registration
     */
    register(config = {}) {
      trace.setGlobalTracerProvider(this);
      setupPropagator(config.propagator);
      setupContextManager(config.contextManager);
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/enums/PerformanceTimingNames.js
  var PerformanceTimingNames;
  (function(PerformanceTimingNames2) {
    PerformanceTimingNames2["CONNECT_END"] = "connectEnd";
    PerformanceTimingNames2["CONNECT_START"] = "connectStart";
    PerformanceTimingNames2["DECODED_BODY_SIZE"] = "decodedBodySize";
    PerformanceTimingNames2["DOM_COMPLETE"] = "domComplete";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_END"] = "domContentLoadedEventEnd";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_START"] = "domContentLoadedEventStart";
    PerformanceTimingNames2["DOM_INTERACTIVE"] = "domInteractive";
    PerformanceTimingNames2["DOMAIN_LOOKUP_END"] = "domainLookupEnd";
    PerformanceTimingNames2["DOMAIN_LOOKUP_START"] = "domainLookupStart";
    PerformanceTimingNames2["ENCODED_BODY_SIZE"] = "encodedBodySize";
    PerformanceTimingNames2["FETCH_START"] = "fetchStart";
    PerformanceTimingNames2["LOAD_EVENT_END"] = "loadEventEnd";
    PerformanceTimingNames2["LOAD_EVENT_START"] = "loadEventStart";
    PerformanceTimingNames2["NAVIGATION_START"] = "navigationStart";
    PerformanceTimingNames2["REDIRECT_END"] = "redirectEnd";
    PerformanceTimingNames2["REDIRECT_START"] = "redirectStart";
    PerformanceTimingNames2["REQUEST_START"] = "requestStart";
    PerformanceTimingNames2["RESPONSE_END"] = "responseEnd";
    PerformanceTimingNames2["RESPONSE_START"] = "responseStart";
    PerformanceTimingNames2["SECURE_CONNECTION_START"] = "secureConnectionStart";
    PerformanceTimingNames2["START_TIME"] = "startTime";
    PerformanceTimingNames2["UNLOAD_EVENT_END"] = "unloadEventEnd";
    PerformanceTimingNames2["UNLOAD_EVENT_START"] = "unloadEventStart";
  })(PerformanceTimingNames || (PerformanceTimingNames = {}));

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/semconv.js
  var ATTR_HTTP_RESPONSE_CONTENT_LENGTH = "http.response_content_length";
  var ATTR_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = "http.response_content_length_uncompressed";

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/utils.js
  var urlNormalizingAnchor;
  function getUrlNormalizingAnchor() {
    if (!urlNormalizingAnchor) {
      urlNormalizingAnchor = document.createElement("a");
    }
    return urlNormalizingAnchor;
  }
  function hasKey(obj, key) {
    return key in obj;
  }
  function addSpanNetworkEvent(span, performanceName, entries, ignoreZeros = true) {
    if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number" && !(ignoreZeros && entries[performanceName] === 0)) {
      return span.addEvent(performanceName, entries[performanceName]);
    }
    return void 0;
  }
  function addSpanNetworkEvents(span, resource, ignoreNetworkEvents = false, ignoreZeros, skipOldSemconvContentLengthAttrs) {
    if (ignoreZeros === void 0) {
      ignoreZeros = resource[PerformanceTimingNames.START_TIME] !== 0;
    }
    if (!ignoreNetworkEvents) {
      addSpanNetworkEvent(span, PerformanceTimingNames.FETCH_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_END, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.SECURE_CONNECTION_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_END, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.REQUEST_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_END, resource, ignoreZeros);
    }
    if (!skipOldSemconvContentLengthAttrs) {
      const encodedLength = resource[PerformanceTimingNames.ENCODED_BODY_SIZE];
      if (encodedLength !== void 0) {
        span.setAttribute(ATTR_HTTP_RESPONSE_CONTENT_LENGTH, encodedLength);
      }
      const decodedLength = resource[PerformanceTimingNames.DECODED_BODY_SIZE];
      if (decodedLength !== void 0 && encodedLength !== decodedLength) {
        span.setAttribute(ATTR_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, decodedLength);
      }
    }
  }
  function sortResources(filteredResources) {
    return filteredResources.slice().sort((a2, b2) => {
      const valueA = a2[PerformanceTimingNames.FETCH_START];
      const valueB = b2[PerformanceTimingNames.FETCH_START];
      if (valueA > valueB) {
        return 1;
      } else if (valueA < valueB) {
        return -1;
      }
      return 0;
    });
  }
  function getOrigin() {
    return typeof location !== "undefined" ? location.origin : void 0;
  }
  function getResource(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources = /* @__PURE__ */ new WeakSet(), initiatorType) {
    const parsedSpanUrl = parseUrl(spanUrl);
    spanUrl = parsedSpanUrl.toString();
    const filteredResources = filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType);
    if (filteredResources.length === 0) {
      return {
        mainRequest: void 0
      };
    }
    if (filteredResources.length === 1) {
      return {
        mainRequest: filteredResources[0]
      };
    }
    const sorted = sortResources(filteredResources);
    if (parsedSpanUrl.origin !== getOrigin() && sorted.length > 1) {
      let corsPreFlightRequest = sorted[0];
      let mainRequest = findMainRequest(sorted, corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END], endTimeHR);
      const responseEnd = corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END];
      const fetchStart = mainRequest[PerformanceTimingNames.FETCH_START];
      if (fetchStart < responseEnd) {
        mainRequest = corsPreFlightRequest;
        corsPreFlightRequest = void 0;
      }
      return {
        corsPreFlightRequest,
        mainRequest
      };
    } else {
      return {
        mainRequest: filteredResources[0]
      };
    }
  }
  function findMainRequest(resources, corsPreFlightRequestEndTime, spanEndTimeHR) {
    const spanEndTime = hrTimeToNanoseconds(spanEndTimeHR);
    const minTime = hrTimeToNanoseconds(timeInputToHrTime(corsPreFlightRequestEndTime));
    let mainRequest = resources[1];
    let bestGap;
    const length = resources.length;
    for (let i2 = 1; i2 < length; i2++) {
      const resource = resources[i2];
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      const resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      const currentGap = spanEndTime - resourceEndTime;
      if (resourceStartTime >= minTime && (!bestGap || currentGap < bestGap)) {
        bestGap = currentGap;
        mainRequest = resource;
      }
    }
    return mainRequest;
  }
  function filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType) {
    const startTime = hrTimeToNanoseconds(startTimeHR);
    const endTime = hrTimeToNanoseconds(endTimeHR);
    let filteredResources = resources.filter((resource) => {
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      const resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      return resource.initiatorType.toLowerCase() === (initiatorType || "xmlhttprequest") && resource.name === spanUrl && resourceStartTime >= startTime && resourceEndTime <= endTime;
    });
    if (filteredResources.length > 0) {
      filteredResources = filteredResources.filter((resource) => {
        return !ignoredResources.has(resource);
      });
    }
    return filteredResources;
  }
  function parseUrl(url) {
    if (typeof URL === "function") {
      return new URL(url, typeof document !== "undefined" ? document.baseURI : typeof location !== "undefined" ? location.href : void 0);
    }
    const element = getUrlNormalizingAnchor();
    element.href = url;
    return element;
  }
  function getElementXPath(target, optimised) {
    if (target.nodeType === Node.DOCUMENT_NODE) {
      return "/";
    }
    const targetValue = getNodeValue(target, optimised);
    if (optimised && targetValue.indexOf("@id") > 0) {
      return targetValue;
    }
    let xpath = "";
    if (target.parentNode) {
      xpath += getElementXPath(target.parentNode, false);
    }
    xpath += targetValue;
    return xpath;
  }
  function getNodeIndex(target) {
    if (!target.parentNode) {
      return 0;
    }
    const allowedTypes = [target.nodeType];
    if (target.nodeType === Node.CDATA_SECTION_NODE) {
      allowedTypes.push(Node.TEXT_NODE);
    }
    let elements = Array.from(target.parentNode.childNodes);
    elements = elements.filter((element) => {
      const localName = element.localName;
      return allowedTypes.indexOf(element.nodeType) >= 0 && localName === target.localName;
    });
    if (elements.length >= 1) {
      return elements.indexOf(target) + 1;
    }
    return 0;
  }
  function getNodeValue(target, optimised) {
    const nodeType = target.nodeType;
    const index = getNodeIndex(target);
    let nodeValue = "";
    if (nodeType === Node.ELEMENT_NODE) {
      const id = target.getAttribute("id");
      if (optimised && id) {
        return `//*[@id="${id}"]`;
      }
      nodeValue = target.localName;
    } else if (nodeType === Node.TEXT_NODE || nodeType === Node.CDATA_SECTION_NODE) {
      nodeValue = "text()";
    } else if (nodeType === Node.COMMENT_NODE) {
      nodeValue = "comment()";
    } else {
      return "";
    }
    if (nodeValue && index > 1) {
      return `/${nodeValue}[${index}]`;
    }
    return `/${nodeValue}`;
  }
  function shouldPropagateTraceHeaders(spanUrl, propagateTraceHeaderCorsUrls) {
    let propagateTraceHeaderUrls = propagateTraceHeaderCorsUrls || [];
    if (typeof propagateTraceHeaderUrls === "string" || propagateTraceHeaderUrls instanceof RegExp) {
      propagateTraceHeaderUrls = [propagateTraceHeaderUrls];
    }
    const parsedSpanUrl = parseUrl(spanUrl);
    if (parsedSpanUrl.origin === getOrigin()) {
      return true;
    } else {
      return propagateTraceHeaderUrls.some((propagateTraceHeaderUrl) => urlMatches(spanUrl, propagateTraceHeaderUrl));
    }
  }

  // node_modules/@opentelemetry/opentelemetry-browser-detector/node_modules/@opentelemetry/resources/build/esm/utils.js
  var isPromiseLike2 = (val) => {
    return val !== null && typeof val === "object" && typeof val.then === "function";
  };

  // node_modules/@opentelemetry/opentelemetry-browser-detector/node_modules/@opentelemetry/resources/build/esm/ResourceImpl.js
  var ResourceImpl2 = class _ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _memoizedAttributes;
    static FromAttributeList(attributes) {
      const res = new _ResourceImpl({});
      res._rawAttributes = guardedRawAttributes2(attributes);
      res._asyncAttributesPending = attributes.filter(([_2, val]) => isPromiseLike2(val)).length > 0;
      return res;
    }
    constructor(resource) {
      const attributes = resource.attributes ?? {};
      this._rawAttributes = Object.entries(attributes).map(([k2, v2]) => {
        if (isPromiseLike2(v2)) {
          this._asyncAttributesPending = true;
        }
        return [k2, v2];
      });
      this._rawAttributes = guardedRawAttributes2(this._rawAttributes);
    }
    get asyncAttributesPending() {
      return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
      if (!this.asyncAttributesPending) {
        return;
      }
      for (let i2 = 0; i2 < this._rawAttributes.length; i2++) {
        const [k2, v2] = this._rawAttributes[i2];
        this._rawAttributes[i2] = [k2, isPromiseLike2(v2) ? await v2 : v2];
      }
      this._asyncAttributesPending = false;
    }
    get attributes() {
      if (this.asyncAttributesPending) {
        diag2.error("Accessing resource attributes before async attributes settled");
      }
      if (this._memoizedAttributes) {
        return this._memoizedAttributes;
      }
      const attrs = {};
      for (const [k2, v2] of this._rawAttributes) {
        if (isPromiseLike2(v2)) {
          diag2.debug(`Unsettled resource attribute ${k2} skipped`);
          continue;
        }
        if (v2 != null) {
          attrs[k2] ??= v2;
        }
      }
      if (!this._asyncAttributesPending) {
        this._memoizedAttributes = attrs;
      }
      return attrs;
    }
    getRawAttributes() {
      return this._rawAttributes;
    }
    merge(resource) {
      if (resource == null)
        return this;
      return _ResourceImpl.FromAttributeList([
        ...resource.getRawAttributes(),
        ...this.getRawAttributes()
      ]);
    }
  };
  function resourceFromAttributes2(attributes) {
    return ResourceImpl2.FromAttributeList(Object.entries(attributes));
  }
  function emptyResource2() {
    return resourceFromAttributes2({});
  }
  function guardedRawAttributes2(attributes) {
    return attributes.map(([k2, v2]) => {
      if (isPromiseLike2(v2)) {
        return [
          k2,
          v2.catch((err) => {
            diag2.debug("promise rejection for resource attribute: %s - %s", k2, err);
            return void 0;
          })
        ];
      }
      return [k2, v2];
    });
  }

  // node_modules/@opentelemetry/opentelemetry-browser-detector/build/esm/types.js
  var BROWSER_ATTRIBUTES = {
    PLATFORM: "browser.platform",
    BRANDS: "browser.brands",
    MOBILE: "browser.mobile",
    LANGUAGE: "browser.language",
    USER_AGENT: "browser.user_agent"
  };

  // node_modules/@opentelemetry/opentelemetry-browser-detector/build/esm/BrowserDetector.js
  var BrowserDetector = class {
    detect(config) {
      const isBrowser = typeof navigator !== "undefined";
      if (!isBrowser) {
        return emptyResource2();
      }
      const browserResource = getBrowserAttributes();
      return this._getResourceAttributes(browserResource, config);
    }
    /**
     * Validates browser resource attribute map from browser variables
     *
     * @param browserResource The un-sanitized resource attributes from browser as key/value pairs.
     * @param config: Config
     * @returns The sanitized resource attributes.
     */
    _getResourceAttributes(browserResource, _config) {
      if (!browserResource[BROWSER_ATTRIBUTES.USER_AGENT] && !browserResource[BROWSER_ATTRIBUTES.PLATFORM]) {
        diag2.debug("BrowserDetector failed: Unable to find required browser resources. ");
        return emptyResource2();
      } else {
        return { attributes: browserResource };
      }
    }
  };
  function getBrowserAttributes() {
    const browserAttribs = {};
    const userAgentData = navigator.userAgentData;
    if (userAgentData) {
      browserAttribs[BROWSER_ATTRIBUTES.PLATFORM] = userAgentData.platform;
      browserAttribs[BROWSER_ATTRIBUTES.BRANDS] = userAgentData.brands.map((b2) => `${b2.brand} ${b2.version}`);
      browserAttribs[BROWSER_ATTRIBUTES.MOBILE] = userAgentData.mobile;
    } else {
      browserAttribs[BROWSER_ATTRIBUTES.USER_AGENT] = navigator.userAgent;
    }
    browserAttribs[BROWSER_ATTRIBUTES.LANGUAGE] = navigator.language;
    return browserAttribs;
  }
  var browserDetector = new BrowserDetector();

  // node_modules/@honeycombio/opentelemetry-web/dist/esm/user-interaction-instrumentation-e2UGPk8b.js
  var VERSION4 = "1.0.2";
  var INSTRUMENTATION_NAME = "@honeycombio/user-instrumentation";
  var DEFAULT_EVENT_NAMES = ["click"];
  var UserInteractionInstrumentation = class _UserInteractionInstrumentation extends InstrumentationBase {
    constructor(config = {}) {
      var _a, _b;
      super(INSTRUMENTATION_NAME, VERSION4, config);
      this._config = config;
      this._isEnabled = (_a = this._config.enabled) !== null && _a !== void 0 ? _a : false;
      this._listeners = (_b = this._listeners) !== null && _b !== void 0 ? _b : [];
    }
    init() {
    }
    static handleEndSpan(ev) {
      var _a;
      (_a = _UserInteractionInstrumentation._eventMap.get(ev)) === null || _a === void 0 ? void 0 : _a.end();
    }
    static createGlobalEventListener(eventName, rootNodeId, isInstrumentationEnabled) {
      return (event) => {
        const element = event.target;
        if (isInstrumentationEnabled() === false) return;
        if (_UserInteractionInstrumentation._eventMap.has(event)) return;
        if (!shouldCreateSpan(event, element, eventName, rootNodeId)) return;
        const xpath = getElementXPath(element);
        const tracer = trace.getTracer(INSTRUMENTATION_NAME);
        context.with(context.active(), () => {
          tracer.startActiveSpan(eventName, {
            attributes: {
              event_type: eventName,
              target_element: element.tagName,
              target_xpath: xpath,
              "http.url": window.location.href
            }
          }, (span) => {
            wrapEventPropagationCb(event, "stopPropagation", span);
            wrapEventPropagationCb(event, "stopImmediatePropagation", span);
            _UserInteractionInstrumentation._eventMap.set(event, span);
          });
        });
      };
    }
    enable() {
      var _a;
      if (this._isEnabled) {
        return;
      }
      const rootNode = this.getRootNode();
      this._listeners = [];
      const eventNames = (_a = this._config.eventNames) !== null && _a !== void 0 ? _a : DEFAULT_EVENT_NAMES;
      eventNames.forEach((eventName) => {
        const handler = _UserInteractionInstrumentation.createGlobalEventListener(eventName, this._config.rootNodeId, () => this._isEnabled);
        this._listeners.push({
          eventName,
          handler
        });
        rootNode.addEventListener(eventName, handler, {
          capture: true
        });
        rootNode.addEventListener(eventName, _UserInteractionInstrumentation.handleEndSpan);
      });
      this._isEnabled = true;
    }
    getRootNode() {
      if (this._config.rootNodeId) {
        const rootNode = document.getElementById(this._config.rootNodeId);
        if (rootNode === null) {
          this._diag.warn(`Root Node id: ${this._config.rootNodeId} not found!`);
          return document;
        }
        return rootNode;
      }
      return document;
    }
    disable() {
      this._isEnabled = false;
      this._listeners.forEach(({
        eventName,
        handler
      }) => {
        document.removeEventListener(eventName, handler, {
          capture: true
        });
        document.removeEventListener(eventName, _UserInteractionInstrumentation.handleEndSpan);
      });
      this._listeners = [];
    }
  };
  UserInteractionInstrumentation._eventMap = /* @__PURE__ */ new WeakMap();
  var shouldCreateSpan = (event, element, eventName, rootNodeId) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    const handlerName = `on${eventName}`;
    if (!elementHasEventHandler(element, handlerName, rootNodeId)) {
      return false;
    }
    if (!element.getAttribute) {
      return false;
    }
    if (element.hasAttribute("disabled")) {
      return false;
    }
    return true;
  };
  var elementHasEventHandler = (element, eventName, rootNodeId) => {
    if (!element || !!rootNodeId && element.id === rootNodeId) {
      return false;
    }
    if (element[eventName]) {
      return true;
    }
    return elementHasEventHandler(element.parentElement, eventName, rootNodeId);
  };
  var wrapEventPropagationCb = (event, key, span) => {
    const oldCb = event[key].bind(event);
    event[key] = () => {
      span.end();
      oldCb();
    };
  };

  // node_modules/@honeycombio/opentelemetry-web/dist/esm/index.js
  var shimmer2 = __toESM(require_shimmer());
  var import_tracekit = __toESM(require_tracekit());

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/OTLPExporterBase.js
  var OTLPExporterBase = class {
    _delegate;
    constructor(_delegate) {
      this._delegate = _delegate;
    }
    /**
     * Export items.
     * @param items
     * @param resultCallback
     */
    export(items, resultCallback) {
      this._delegate.export(items, resultCallback);
    }
    forceFlush() {
      return this._delegate.forceFlush();
    }
    shutdown() {
      return this._delegate.shutdown();
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/types.js
  var OTLPExporterError = class extends Error {
    code;
    name = "OTLPExporterError";
    data;
    constructor(message, code, data) {
      super(message);
      this.data = data;
      this.code = code;
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/shared-configuration.js
  function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) {
      return timeoutMillis;
    }
    throw new Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`);
  }
  function wrapStaticHeadersInFunction(headers) {
    if (headers == null) {
      return void 0;
    }
    return () => headers;
  }
  function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      timeoutMillis: validateTimeoutMillis(userProvidedConfiguration.timeoutMillis ?? fallbackConfiguration.timeoutMillis ?? defaultConfiguration.timeoutMillis),
      concurrencyLimit: userProvidedConfiguration.concurrencyLimit ?? fallbackConfiguration.concurrencyLimit ?? defaultConfiguration.concurrencyLimit,
      compression: userProvidedConfiguration.compression ?? fallbackConfiguration.compression ?? defaultConfiguration.compression
    };
  }
  function getSharedConfigurationDefaults() {
    return {
      timeoutMillis: 1e4,
      concurrencyLimit: 30,
      compression: "none"
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/bounded-queue-export-promise-handler.js
  var BoundedQueueExportPromiseHandler = class {
    _concurrencyLimit;
    _sendingPromises = [];
    /**
     * @param concurrencyLimit maximum promises allowed in a queue at the same time.
     */
    constructor(concurrencyLimit) {
      this._concurrencyLimit = concurrencyLimit;
    }
    pushPromise(promise) {
      if (this.hasReachedLimit()) {
        throw new Error("Concurrency Limit reached");
      }
      this._sendingPromises.push(promise);
      const popPromise = () => {
        const index = this._sendingPromises.indexOf(promise);
        void this._sendingPromises.splice(index, 1);
      };
      promise.then(popPromise, popPromise);
    }
    hasReachedLimit() {
      return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
      await Promise.all(this._sendingPromises);
    }
  };
  function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode2;
  (function(ExportResultCode3) {
    ExportResultCode3[ExportResultCode3["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode3[ExportResultCode3["FAILED"] = 1] = "FAILED";
  })(ExportResultCode2 || (ExportResultCode2 = {}));

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/logging-response-handler.js
  function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, "partialSuccess");
  }
  function createLoggingPartialSuccessResponseHandler() {
    return {
      handleResponse(response) {
        if (response == null || !isPartialSuccessResponse(response) || response.partialSuccess == null || Object.keys(response.partialSuccess).length === 0) {
          return;
        }
        diag2.warn("Received Partial Success response:", JSON.stringify(response.partialSuccess));
      }
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-export-delegate.js
  var OTLPExportDelegate = class {
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    _diagLogger;
    constructor(_transport, _serializer, _responseHandler, _promiseQueue, _timeout) {
      this._transport = _transport;
      this._serializer = _serializer;
      this._responseHandler = _responseHandler;
      this._promiseQueue = _promiseQueue;
      this._timeout = _timeout;
      this._diagLogger = diag2.createComponentLogger({
        namespace: "OTLPExportDelegate"
      });
    }
    export(internalRepresentation, resultCallback) {
      this._diagLogger.debug("items to be sent", internalRepresentation);
      if (this._promiseQueue.hasReachedLimit()) {
        resultCallback({
          code: ExportResultCode2.FAILED,
          error: new Error("Concurrent export limit reached")
        });
        return;
      }
      const serializedRequest = this._serializer.serializeRequest(internalRepresentation);
      if (serializedRequest == null) {
        resultCallback({
          code: ExportResultCode2.FAILED,
          error: new Error("Nothing to send")
        });
        return;
      }
      this._promiseQueue.pushPromise(this._transport.send(serializedRequest, this._timeout).then((response) => {
        if (response.status === "success") {
          if (response.data != null) {
            try {
              this._responseHandler.handleResponse(this._serializer.deserializeResponse(response.data));
            } catch (e2) {
              this._diagLogger.warn("Export succeeded but could not deserialize response - is the response specification compliant?", e2, response.data);
            }
          }
          resultCallback({
            code: ExportResultCode2.SUCCESS
          });
          return;
        } else if (response.status === "failure" && response.error) {
          resultCallback({
            code: ExportResultCode2.FAILED,
            error: response.error
          });
          return;
        } else if (response.status === "retryable") {
          resultCallback({
            code: ExportResultCode2.FAILED,
            error: new OTLPExporterError("Export failed with retryable status")
          });
        } else {
          resultCallback({
            code: ExportResultCode2.FAILED,
            error: new OTLPExporterError("Export failed with unknown error")
          });
        }
      }, (reason) => resultCallback({
        code: ExportResultCode2.FAILED,
        error: reason
      })));
    }
    forceFlush() {
      return this._promiseQueue.awaitAll();
    }
    async shutdown() {
      this._diagLogger.debug("shutdown started");
      await this.forceFlush();
      this._transport.shutdown();
    }
  };
  function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(components.transport, components.serializer, createLoggingPartialSuccessResponseHandler(), components.promiseHandler, settings.timeout);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-network-export-delegate.js
  function createOtlpNetworkExportDelegate(options, serializer, transport) {
    return createOtlpExportDelegate({
      transport,
      serializer,
      promiseHandler: createBoundedQueueExportPromiseHandler(options)
    }, { timeout: options.timeoutMillis });
  }

  // node_modules/@opentelemetry/otlp-transformer/node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS2 = 9;
  var NANOSECOND_DIGITS_IN_MILLIS2 = 6;
  var MILLISECONDS_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS2);
  var SECOND_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS2);
  function hrTimeToNanoseconds2(time) {
    return time[0] * SECOND_TO_NANOSECONDS2 + time[1];
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/hex-to-binary.js
  function intValue(charCode) {
    if (charCode >= 48 && charCode <= 57) {
      return charCode - 48;
    }
    if (charCode >= 97 && charCode <= 102) {
      return charCode - 87;
    }
    return charCode - 55;
  }
  function hexToBinary(hexStr) {
    const buf = new Uint8Array(hexStr.length / 2);
    let offset = 0;
    for (let i2 = 0; i2 < hexStr.length; i2 += 2) {
      const hi = intValue(hexStr.charCodeAt(i2));
      const lo = intValue(hexStr.charCodeAt(i2 + 1));
      buf[offset++] = hi << 4 | lo;
    }
    return buf;
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/utils.js
  function hrTimeToNanos(hrTime3) {
    const NANOSECONDS = BigInt(1e9);
    return BigInt(hrTime3[0]) * NANOSECONDS + BigInt(hrTime3[1]);
  }
  function toLongBits(value) {
    const low = Number(BigInt.asUintN(32, value));
    const high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
  }
  function encodeAsLongBits(hrTime3) {
    const nanos = hrTimeToNanos(hrTime3);
    return toLongBits(nanos);
  }
  function encodeAsString(hrTime3) {
    const nanos = hrTimeToNanos(hrTime3);
    return nanos.toString();
  }
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : hrTimeToNanoseconds2;
  function identity(value) {
    return value;
  }
  function optionalHexToBinary(str) {
    if (str === void 0)
      return void 0;
    return hexToBinary(str);
  }
  var DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary
  };
  function getOtlpEncoder(options) {
    if (options === void 0) {
      return DEFAULT_ENCODER;
    }
    const useLongBits = options.useLongBits ?? true;
    const useHex = options.useHex ?? false;
    return {
      encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
      encodeSpanContext: useHex ? identity : hexToBinary,
      encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary
    };
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/internal.js
  function createResource(resource) {
    return {
      attributes: toAttributes(resource.attributes),
      droppedAttributesCount: 0
    };
  }
  function createInstrumentationScope(scope) {
    return {
      name: scope.name,
      version: scope.version
    };
  }
  function toAttributes(attributes) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key]));
  }
  function toKeyValue(key, value) {
    return {
      key,
      value: toAnyValue(value)
    };
  }
  function toAnyValue(value) {
    const t2 = typeof value;
    if (t2 === "string")
      return { stringValue: value };
    if (t2 === "number") {
      if (!Number.isInteger(value))
        return { doubleValue: value };
      return { intValue: value };
    }
    if (t2 === "boolean")
      return { boolValue: value };
    if (value instanceof Uint8Array)
      return { bytesValue: value };
    if (Array.isArray(value))
      return { arrayValue: { values: value.map(toAnyValue) } };
    if (t2 === "object" && value != null)
      return {
        kvlistValue: {
          values: Object.entries(value).map(([k2, v2]) => toKeyValue(k2, v2))
        }
      };
    return {};
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/logs/internal.js
  function createExportLogsServiceRequest(logRecords, options) {
    const encoder = getOtlpEncoder(options);
    return {
      resourceLogs: logRecordsToResourceLogs(logRecords, encoder)
    };
  }
  function createResourceMap(logRecords) {
    const resourceMap = /* @__PURE__ */ new Map();
    for (const record of logRecords) {
      const { resource, instrumentationScope: { name, version = "", schemaUrl = "" } } = record;
      let ismMap = resourceMap.get(resource);
      if (!ismMap) {
        ismMap = /* @__PURE__ */ new Map();
        resourceMap.set(resource, ismMap);
      }
      const ismKey = `${name}@${version}:${schemaUrl}`;
      let records = ismMap.get(ismKey);
      if (!records) {
        records = [];
        ismMap.set(ismKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function logRecordsToResourceLogs(logRecords, encoder) {
    const resourceMap = createResourceMap(logRecords);
    return Array.from(resourceMap, ([resource, ismMap]) => ({
      resource: createResource(resource),
      scopeLogs: Array.from(ismMap, ([, scopeLogs]) => {
        return {
          scope: createInstrumentationScope(scopeLogs[0].instrumentationScope),
          logRecords: scopeLogs.map((log) => toLogRecord(log, encoder)),
          schemaUrl: scopeLogs[0].instrumentationScope.schemaUrl
        };
      }),
      schemaUrl: void 0
    }));
  }
  function toLogRecord(log, encoder) {
    return {
      timeUnixNano: encoder.encodeHrTime(log.hrTime),
      observedTimeUnixNano: encoder.encodeHrTime(log.hrTimeObserved),
      severityNumber: toSeverityNumber(log.severityNumber),
      severityText: log.severityText,
      body: toAnyValue(log.body),
      eventName: log.eventName,
      attributes: toLogAttributes(log.attributes),
      droppedAttributesCount: log.droppedAttributesCount,
      flags: log.spanContext?.traceFlags,
      traceId: encoder.encodeOptionalSpanContext(log.spanContext?.traceId),
      spanId: encoder.encodeOptionalSpanContext(log.spanContext?.spanId)
    };
  }
  function toSeverityNumber(severityNumber) {
    return severityNumber;
  }
  function toLogAttributes(attributes) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key]));
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/AggregationTemporality.js
  var AggregationTemporality;
  (function(AggregationTemporality3) {
    AggregationTemporality3[AggregationTemporality3["DELTA"] = 0] = "DELTA";
    AggregationTemporality3[AggregationTemporality3["CUMULATIVE"] = 1] = "CUMULATIVE";
  })(AggregationTemporality || (AggregationTemporality = {}));

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/MetricData.js
  var InstrumentType;
  (function(InstrumentType3) {
    InstrumentType3["COUNTER"] = "COUNTER";
    InstrumentType3["GAUGE"] = "GAUGE";
    InstrumentType3["HISTOGRAM"] = "HISTOGRAM";
    InstrumentType3["UP_DOWN_COUNTER"] = "UP_DOWN_COUNTER";
    InstrumentType3["OBSERVABLE_COUNTER"] = "OBSERVABLE_COUNTER";
    InstrumentType3["OBSERVABLE_GAUGE"] = "OBSERVABLE_GAUGE";
    InstrumentType3["OBSERVABLE_UP_DOWN_COUNTER"] = "OBSERVABLE_UP_DOWN_COUNTER";
  })(InstrumentType || (InstrumentType = {}));
  var DataPointType;
  (function(DataPointType3) {
    DataPointType3[DataPointType3["HISTOGRAM"] = 0] = "HISTOGRAM";
    DataPointType3[DataPointType3["EXPONENTIAL_HISTOGRAM"] = 1] = "EXPONENTIAL_HISTOGRAM";
    DataPointType3[DataPointType3["GAUGE"] = 2] = "GAUGE";
    DataPointType3[DataPointType3["SUM"] = 3] = "SUM";
  })(DataPointType || (DataPointType = {}));

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/AggregationOption.js
  var AggregationType;
  (function(AggregationType3) {
    AggregationType3[AggregationType3["DEFAULT"] = 0] = "DEFAULT";
    AggregationType3[AggregationType3["DROP"] = 1] = "DROP";
    AggregationType3[AggregationType3["SUM"] = 2] = "SUM";
    AggregationType3[AggregationType3["LAST_VALUE"] = 3] = "LAST_VALUE";
    AggregationType3[AggregationType3["EXPLICIT_BUCKET_HISTOGRAM"] = 4] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType3[AggregationType3["EXPONENTIAL_HISTOGRAM"] = 5] = "EXPONENTIAL_HISTOGRAM";
  })(AggregationType || (AggregationType = {}));

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/internal-types.js
  var EAggregationTemporality;
  (function(EAggregationTemporality2) {
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_UNSPECIFIED"] = 0] = "AGGREGATION_TEMPORALITY_UNSPECIFIED";
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_DELTA"] = 1] = "AGGREGATION_TEMPORALITY_DELTA";
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_CUMULATIVE"] = 2] = "AGGREGATION_TEMPORALITY_CUMULATIVE";
  })(EAggregationTemporality || (EAggregationTemporality = {}));

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/internal.js
  function toResourceMetrics(resourceMetrics, options) {
    const encoder = getOtlpEncoder(options);
    return {
      resource: createResource(resourceMetrics.resource),
      schemaUrl: void 0,
      scopeMetrics: toScopeMetrics(resourceMetrics.scopeMetrics, encoder)
    };
  }
  function toScopeMetrics(scopeMetrics, encoder) {
    return Array.from(scopeMetrics.map((metrics2) => ({
      scope: createInstrumentationScope(metrics2.scope),
      metrics: metrics2.metrics.map((metricData) => toMetric(metricData, encoder)),
      schemaUrl: metrics2.scope.schemaUrl
    })));
  }
  function toMetric(metricData, encoder) {
    const out = {
      name: metricData.descriptor.name,
      description: metricData.descriptor.description,
      unit: metricData.descriptor.unit
    };
    const aggregationTemporality = toAggregationTemporality(metricData.aggregationTemporality);
    switch (metricData.dataPointType) {
      case DataPointType.SUM:
        out.sum = {
          aggregationTemporality,
          isMonotonic: metricData.isMonotonic,
          dataPoints: toSingularDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.GAUGE:
        out.gauge = {
          dataPoints: toSingularDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.HISTOGRAM:
        out.histogram = {
          aggregationTemporality,
          dataPoints: toHistogramDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.EXPONENTIAL_HISTOGRAM:
        out.exponentialHistogram = {
          aggregationTemporality,
          dataPoints: toExponentialHistogramDataPoints(metricData, encoder)
        };
        break;
    }
    return out;
  }
  function toSingularDataPoint(dataPoint, valueType, encoder) {
    const out = {
      attributes: toAttributes(dataPoint.attributes),
      startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
      timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
    };
    switch (valueType) {
      case ValueType.INT:
        out.asInt = dataPoint.value;
        break;
      case ValueType.DOUBLE:
        out.asDouble = dataPoint.value;
        break;
    }
    return out;
  }
  function toSingularDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      return toSingularDataPoint(dataPoint, metricData.descriptor.valueType, encoder);
    });
  }
  function toHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      const histogram = dataPoint.value;
      return {
        attributes: toAttributes(dataPoint.attributes),
        bucketCounts: histogram.buckets.counts,
        explicitBounds: histogram.buckets.boundaries,
        count: histogram.count,
        sum: histogram.sum,
        min: histogram.min,
        max: histogram.max,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
      };
    });
  }
  function toExponentialHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      const histogram = dataPoint.value;
      return {
        attributes: toAttributes(dataPoint.attributes),
        count: histogram.count,
        min: histogram.min,
        max: histogram.max,
        sum: histogram.sum,
        positive: {
          offset: histogram.positive.offset,
          bucketCounts: histogram.positive.bucketCounts
        },
        negative: {
          offset: histogram.negative.offset,
          bucketCounts: histogram.negative.bucketCounts
        },
        scale: histogram.scale,
        zeroCount: histogram.zeroCount,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
      };
    });
  }
  function toAggregationTemporality(temporality) {
    switch (temporality) {
      case AggregationTemporality.DELTA:
        return EAggregationTemporality.AGGREGATION_TEMPORALITY_DELTA;
      case AggregationTemporality.CUMULATIVE:
        return EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE;
    }
  }
  function createExportMetricsServiceRequest(resourceMetrics, options) {
    return {
      resourceMetrics: resourceMetrics.map((metrics2) => toResourceMetrics(metrics2, options))
    };
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/trace/internal.js
  function sdkSpanToOtlpSpan(span, encoder) {
    const ctx = span.spanContext();
    const status = span.status;
    const parentSpanId = span.parentSpanContext?.spanId ? encoder.encodeSpanContext(span.parentSpanContext?.spanId) : void 0;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId,
      traceState: ctx.traceState?.serialize(),
      name: span.name,
      // Span kind is offset by 1 because the API does not define a value for unset
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: toAttributes(span.attributes),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map((event) => toOtlpSpanEvent(event, encoder)),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        // API and proto enums share the same values
        code: status.code,
        message: status.message
      },
      links: span.links.map((link) => toOtlpLink(link, encoder)),
      droppedLinksCount: span.droppedLinksCount
    };
  }
  function toOtlpLink(link, encoder) {
    return {
      attributes: link.attributes ? toAttributes(link.attributes) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: link.context.traceState?.serialize(),
      droppedAttributesCount: link.droppedAttributesCount || 0
    };
  }
  function toOtlpSpanEvent(timedEvent, encoder) {
    return {
      attributes: timedEvent.attributes ? toAttributes(timedEvent.attributes) : [],
      name: timedEvent.name,
      timeUnixNano: encoder.encodeHrTime(timedEvent.time),
      droppedAttributesCount: timedEvent.droppedAttributesCount || 0
    };
  }
  function createExportTraceServiceRequest(spans, options) {
    const encoder = getOtlpEncoder(options);
    return {
      resourceSpans: spanRecordsToResourceSpans(spans, encoder)
    };
  }
  function createResourceMap2(readableSpans) {
    const resourceMap = /* @__PURE__ */ new Map();
    for (const record of readableSpans) {
      let ilsMap = resourceMap.get(record.resource);
      if (!ilsMap) {
        ilsMap = /* @__PURE__ */ new Map();
        resourceMap.set(record.resource, ilsMap);
      }
      const instrumentationScopeKey = `${record.instrumentationScope.name}@${record.instrumentationScope.version || ""}:${record.instrumentationScope.schemaUrl || ""}`;
      let records = ilsMap.get(instrumentationScopeKey);
      if (!records) {
        records = [];
        ilsMap.set(instrumentationScopeKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    const resourceMap = createResourceMap2(readableSpans);
    const out = [];
    const entryIterator = resourceMap.entries();
    let entry = entryIterator.next();
    while (!entry.done) {
      const [resource, ilmMap] = entry.value;
      const scopeResourceSpans = [];
      const ilmIterator = ilmMap.values();
      let ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        const scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          const spans = scopeSpans.map((readableSpan) => sdkSpanToOtlpSpan(readableSpan, encoder));
          scopeResourceSpans.push({
            scope: createInstrumentationScope(scopeSpans[0].instrumentationScope),
            spans,
            schemaUrl: scopeSpans[0].instrumentationScope.schemaUrl
          });
        }
        ilmEntry = ilmIterator.next();
      }
      const transformedSpans = {
        resource: createResource(resource),
        scopeSpans: scopeResourceSpans,
        schemaUrl: void 0
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/logs/json/logs.js
  var JsonLogsSerializer = {
    serializeRequest: (arg) => {
      const request = createExportLogsServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/json/metrics.js
  var JsonMetricsSerializer = {
    serializeRequest: (arg) => {
      const request = createExportMetricsServiceRequest([arg], {
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/build/esm/trace/json/trace.js
  var JsonTraceSerializer = {
    serializeRequest: (arg) => {
      const request = createExportTraceServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/retrying-transport.js
  var MAX_ATTEMPTS = 5;
  var INITIAL_BACKOFF = 1e3;
  var MAX_BACKOFF = 5e3;
  var BACKOFF_MULTIPLIER = 1.5;
  var JITTER = 0.2;
  function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
  }
  var RetryingTransport = class {
    _transport;
    constructor(_transport) {
      this._transport = _transport;
    }
    retry(data, timeoutMillis, inMillis) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this._transport.send(data, timeoutMillis).then(resolve, reject);
        }, inMillis);
      });
    }
    async send(data, timeoutMillis) {
      const deadline = Date.now() + timeoutMillis;
      let result = await this._transport.send(data, timeoutMillis);
      let attempts = MAX_ATTEMPTS;
      let nextBackoff = INITIAL_BACKOFF;
      while (result.status === "retryable" && attempts > 0) {
        attempts--;
        const backoff = Math.max(Math.min(nextBackoff, MAX_BACKOFF) + getJitter(), 0);
        nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
        const retryInMillis = result.retryInMillis ?? backoff;
        const remainingTimeoutMillis = deadline - Date.now();
        if (retryInMillis > remainingTimeoutMillis) {
          return result;
        }
        result = await this.retry(data, remainingTimeoutMillis, retryInMillis);
      }
      return result;
    }
    shutdown() {
      return this._transport.shutdown();
    }
  };
  function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/is-export-retryable.js
  function isExportRetryable(statusCode) {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
  }
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
      return void 0;
    }
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
      return seconds > 0 ? seconds * 1e3 : -1;
    }
    const delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
      return delay;
    }
    return 0;
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/xhr-transport.js
  var XhrTransport = class {
    _parameters;
    constructor(_parameters) {
      this._parameters = _parameters;
    }
    send(data, timeoutMillis) {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = timeoutMillis;
        xhr.open("POST", this._parameters.url);
        const headers = this._parameters.headers();
        Object.entries(headers).forEach(([k2, v2]) => {
          xhr.setRequestHeader(k2, v2);
        });
        xhr.ontimeout = (_2) => {
          resolve({
            status: "failure",
            error: new Error("XHR request timed out")
          });
        };
        xhr.onreadystatechange = () => {
          if (xhr.status >= 200 && xhr.status <= 299) {
            diag2.debug("XHR success");
            resolve({
              status: "success"
            });
          } else if (xhr.status && isExportRetryable(xhr.status)) {
            resolve({
              status: "retryable",
              retryInMillis: parseRetryAfterToMills(xhr.getResponseHeader("Retry-After"))
            });
          } else if (xhr.status !== 0) {
            resolve({
              status: "failure",
              error: new Error("XHR request failed with non-retryable status")
            });
          }
        };
        xhr.onabort = () => {
          resolve({
            status: "failure",
            error: new Error("XHR request aborted")
          });
        };
        xhr.onerror = () => {
          resolve({
            status: "failure",
            error: new Error("XHR request errored")
          });
        };
        xhr.send(data);
      });
    }
    shutdown() {
    }
  };
  function createXhrTransport(parameters) {
    return new XhrTransport(parameters);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/send-beacon-transport.js
  var SendBeaconTransport = class {
    _params;
    constructor(_params) {
      this._params = _params;
    }
    send(data) {
      return new Promise((resolve) => {
        if (navigator.sendBeacon(this._params.url, new Blob([data], { type: this._params.blobType }))) {
          diag2.debug("SendBeacon success");
          resolve({
            status: "success"
          });
        } else {
          resolve({
            status: "failure",
            error: new Error("SendBeacon failed")
          });
        }
      });
    }
    shutdown() {
    }
  };
  function createSendBeaconTransport(parameters) {
    return new SendBeaconTransport(parameters);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-browser-http-export-delegate.js
  function createOtlpXhrExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
      transport: createXhrTransport(options)
    }));
  }
  function createOtlpSendBeaconExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
      transport: createSendBeaconTransport({
        url: options.url,
        blobType: options.headers()["Content-Type"]
      })
    }));
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/util.js
  function validateAndNormalizeHeaders(partialHeaders) {
    return () => {
      const headers = {};
      Object.entries(partialHeaders?.() ?? {}).forEach(([key, value]) => {
        if (typeof value !== "undefined") {
          headers[key] = String(value);
        } else {
          diag2.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
        }
      });
      return headers;
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/otlp-http-configuration.js
  function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    const requiredHeaders = {
      ...defaultHeaders()
    };
    const headers = {};
    return () => {
      if (fallbackHeaders != null) {
        Object.assign(headers, fallbackHeaders());
      }
      if (userProvidedHeaders != null) {
        Object.assign(headers, userProvidedHeaders());
      }
      return Object.assign(headers, requiredHeaders);
    };
  }
  function validateUserProvidedUrl(url) {
    if (url == null) {
      return void 0;
    }
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error(`Configuration: Could not parse user-provided export URL: '${url}'`);
    }
  }
  function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      ...mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
      headers: mergeHeaders(validateAndNormalizeHeaders(userProvidedConfiguration.headers), fallbackConfiguration.headers, defaultConfiguration.headers),
      url: validateUserProvidedUrl(userProvidedConfiguration.url) ?? fallbackConfiguration.url ?? defaultConfiguration.url,
      agentOptions: userProvidedConfiguration.agentOptions ?? fallbackConfiguration.agentOptions ?? defaultConfiguration.agentOptions
    };
  }
  function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
      ...getSharedConfigurationDefaults(),
      headers: () => requiredHeaders,
      url: "http://localhost:4318/" + signalResourcePath,
      agentOptions: { keepAlive: true }
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/convert-legacy-browser-http-options.js
  function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return mergeOtlpHttpConfigurationWithDefaults(
      {
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: wrapStaticHeadersInFunction(config.headers),
        concurrencyLimit: config.concurrencyLimit
      },
      {},
      // no fallback for browser case
      getHttpConfigurationDefaults(requiredHeaders, signalResourcePath)
    );
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/create-legacy-browser-delegate.js
  function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    const useXhr = !!config.headers || typeof navigator.sendBeacon !== "function";
    const options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    if (useXhr) {
      return createOtlpXhrExportDelegate(options, serializer);
    } else {
      return createOtlpSendBeaconExportDelegate(options, serializer);
    }
  }

  // node_modules/@opentelemetry/exporter-trace-otlp-http/build/esm/platform/browser/OTLPTraceExporter.js
  var OTLPTraceExporter = class extends OTLPExporterBase {
    constructor(config = {}) {
      super(createLegacyOtlpBrowserExportDelegate(config, JsonTraceSerializer, "v1/traces", { "Content-Type": "application/json" }));
    }
  };

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getStringFromEnv2(_2) {
    return void 0;
  }

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/OTLPMetricExporterOptions.js
  var AggregationTemporalityPreference;
  (function(AggregationTemporalityPreference2) {
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["DELTA"] = 0] = "DELTA";
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["CUMULATIVE"] = 1] = "CUMULATIVE";
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["LOWMEMORY"] = 2] = "LOWMEMORY";
  })(AggregationTemporalityPreference || (AggregationTemporalityPreference = {}));

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/OTLPMetricExporterBase.js
  var CumulativeTemporalitySelector = () => AggregationTemporality.CUMULATIVE;
  var DeltaTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case InstrumentType.COUNTER:
      case InstrumentType.OBSERVABLE_COUNTER:
      case InstrumentType.GAUGE:
      case InstrumentType.HISTOGRAM:
      case InstrumentType.OBSERVABLE_GAUGE:
        return AggregationTemporality.DELTA;
      case InstrumentType.UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
        return AggregationTemporality.CUMULATIVE;
    }
  };
  var LowMemoryTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case InstrumentType.COUNTER:
      case InstrumentType.HISTOGRAM:
        return AggregationTemporality.DELTA;
      case InstrumentType.GAUGE:
      case InstrumentType.UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_COUNTER:
      case InstrumentType.OBSERVABLE_GAUGE:
        return AggregationTemporality.CUMULATIVE;
    }
  };
  function chooseTemporalitySelectorFromEnvironment() {
    const configuredTemporality = (getStringFromEnv2("OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE") ?? "cumulative").toLowerCase();
    if (configuredTemporality === "cumulative") {
      return CumulativeTemporalitySelector;
    }
    if (configuredTemporality === "delta") {
      return DeltaTemporalitySelector;
    }
    if (configuredTemporality === "lowmemory") {
      return LowMemoryTemporalitySelector;
    }
    diag2.warn(`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${configuredTemporality}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`);
    return CumulativeTemporalitySelector;
  }
  function chooseTemporalitySelector(temporalityPreference) {
    if (temporalityPreference != null) {
      if (temporalityPreference === AggregationTemporalityPreference.DELTA) {
        return DeltaTemporalitySelector;
      } else if (temporalityPreference === AggregationTemporalityPreference.LOWMEMORY) {
        return LowMemoryTemporalitySelector;
      }
      return CumulativeTemporalitySelector;
    }
    return chooseTemporalitySelectorFromEnvironment();
  }
  var DEFAULT_AGGREGATION = Object.freeze({
    type: AggregationType.DEFAULT
  });
  function chooseAggregationSelector(config) {
    return config?.aggregationPreference ?? (() => DEFAULT_AGGREGATION);
  }
  var OTLPMetricExporterBase = class extends OTLPExporterBase {
    _aggregationTemporalitySelector;
    _aggregationSelector;
    constructor(delegate, config) {
      super(delegate);
      this._aggregationSelector = chooseAggregationSelector(config);
      this._aggregationTemporalitySelector = chooseTemporalitySelector(config?.temporalityPreference);
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
  };

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/platform/browser/OTLPMetricExporter.js
  var OTLPMetricExporter = class extends OTLPMetricExporterBase {
    constructor(config) {
      super(createLegacyOtlpBrowserExportDelegate(config ?? {}, JsonMetricsSerializer, "v1/metrics", { "Content-Type": "application/json" }), config);
    }
  };

  // node_modules/@opentelemetry/exporter-logs-otlp-http/build/esm/platform/browser/OTLPLogExporter.js
  var OTLPLogExporter = class extends OTLPExporterBase {
    constructor(config = {}) {
      super(createLegacyOtlpBrowserExportDelegate(config, JsonLogsSerializer, "v1/logs", { "Content-Type": "application/json" }));
    }
  };

  // node_modules/@opentelemetry/web-common/build/esm/semconv.js
  var ATTR_SESSION_ID = "session.id";

  // node_modules/@opentelemetry/web-common/build/esm/SessionSpanProcessor.js
  var SessionSpanProcessor = class {
    _sessionIdProvider;
    constructor(sessionIdProvider) {
      this._sessionIdProvider = sessionIdProvider;
    }
    /**
     * Forces to export all finished spans
     */
    async forceFlush() {
    }
    /**
     * Called when a {@link Span} is started, if the `span.isRecording()`
     * returns true.
     * @param span the Span that just started.
     */
    onStart(span, _parentContext) {
      const sessionId2 = this._sessionIdProvider?.getSessionId();
      if (sessionId2) {
        span.setAttribute(ATTR_SESSION_ID, sessionId2);
      }
    }
    /**
     * Called when a {@link ReadableSpan} is ended, if the `span.isRecording()`
     * returns true.
     * @param span the Span that just ended.
     */
    onEnd(_2) {
    }
    /**
     * Shuts down the processor. Called when SDK is shut down. This is an
     * opportunity for processor to do any cleanup required.
     */
    async shutdown() {
    }
  };

  // node_modules/@opentelemetry/web-common/build/esm/utils.js
  function createSessionSpanProcessor(sessionProvider) {
    return new SessionSpanProcessor(sessionProvider);
  }

  // node_modules/@honeycombio/opentelemetry-web/dist/esm/index.js
  var import_ua_parser_js = __toESM(require_ua_parser());
  var AggregationTemporality2;
  (function(AggregationTemporality3) {
    AggregationTemporality3[AggregationTemporality3["DELTA"] = 0] = "DELTA";
    AggregationTemporality3[AggregationTemporality3["CUMULATIVE"] = 1] = "CUMULATIVE";
  })(AggregationTemporality2 || (AggregationTemporality2 = {}));
  var InstrumentType2;
  (function(InstrumentType3) {
    InstrumentType3["COUNTER"] = "COUNTER";
    InstrumentType3["GAUGE"] = "GAUGE";
    InstrumentType3["HISTOGRAM"] = "HISTOGRAM";
    InstrumentType3["UP_DOWN_COUNTER"] = "UP_DOWN_COUNTER";
    InstrumentType3["OBSERVABLE_COUNTER"] = "OBSERVABLE_COUNTER";
    InstrumentType3["OBSERVABLE_GAUGE"] = "OBSERVABLE_GAUGE";
    InstrumentType3["OBSERVABLE_UP_DOWN_COUNTER"] = "OBSERVABLE_UP_DOWN_COUNTER";
  })(InstrumentType2 || (InstrumentType2 = {}));
  var DataPointType2;
  (function(DataPointType3) {
    DataPointType3[DataPointType3["HISTOGRAM"] = 0] = "HISTOGRAM";
    DataPointType3[DataPointType3["EXPONENTIAL_HISTOGRAM"] = 1] = "EXPONENTIAL_HISTOGRAM";
    DataPointType3[DataPointType3["GAUGE"] = 2] = "GAUGE";
    DataPointType3[DataPointType3["SUM"] = 3] = "SUM";
  })(DataPointType2 || (DataPointType2 = {}));
  function isNotNullish(item) {
    return item !== void 0 && item !== null;
  }
  function hashAttributes(attributes) {
    let keys = Object.keys(attributes);
    if (keys.length === 0) return "";
    keys = keys.sort();
    return JSON.stringify(keys.map((key) => [key, attributes[key]]));
  }
  function instrumentationScopeId(instrumentationScope) {
    return `${instrumentationScope.name}:${instrumentationScope.version ?? ""}:${instrumentationScope.schemaUrl ?? ""}`;
  }
  var TimeoutError2 = class _TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TimeoutError.prototype);
    }
  };
  function callWithTimeout2(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
      timeoutHandle = setTimeout(function timeoutHandler() {
        reject(new TimeoutError2("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    }, (reason) => {
      clearTimeout(timeoutHandle);
      throw reason;
    });
  }
  async function PromiseAllSettled(promises) {
    return Promise.all(promises.map(async (p2) => {
      try {
        const ret = await p2;
        return {
          status: "fulfilled",
          value: ret
        };
      } catch (e2) {
        return {
          status: "rejected",
          reason: e2
        };
      }
    }));
  }
  function isPromiseAllSettledRejectionResult(it) {
    return it.status === "rejected";
  }
  function FlatMap(arr, fn) {
    const result = [];
    arr.forEach((it) => {
      result.push(...fn(it));
    });
    return result;
  }
  function setEquals(lhs, rhs) {
    if (lhs.size !== rhs.size) {
      return false;
    }
    for (const item of lhs) {
      if (!rhs.has(item)) {
        return false;
      }
    }
    return true;
  }
  function binarySearchUB(arr, value) {
    let lo = 0;
    let hi = arr.length - 1;
    let ret = arr.length;
    while (hi >= lo) {
      const mid = lo + Math.trunc((hi - lo) / 2);
      if (arr[mid] < value) {
        lo = mid + 1;
      } else {
        ret = mid;
        hi = mid - 1;
      }
    }
    return ret;
  }
  function equalsCaseInsensitive(lhs, rhs) {
    return lhs.toLowerCase() === rhs.toLowerCase();
  }
  var AggregatorKind;
  (function(AggregatorKind2) {
    AggregatorKind2[AggregatorKind2["DROP"] = 0] = "DROP";
    AggregatorKind2[AggregatorKind2["SUM"] = 1] = "SUM";
    AggregatorKind2[AggregatorKind2["LAST_VALUE"] = 2] = "LAST_VALUE";
    AggregatorKind2[AggregatorKind2["HISTOGRAM"] = 3] = "HISTOGRAM";
    AggregatorKind2[AggregatorKind2["EXPONENTIAL_HISTOGRAM"] = 4] = "EXPONENTIAL_HISTOGRAM";
  })(AggregatorKind || (AggregatorKind = {}));
  var DropAggregator = class {
    kind = AggregatorKind.DROP;
    createAccumulation() {
      return void 0;
    }
    merge(_previous, _delta) {
      return void 0;
    }
    diff(_previous, _current) {
      return void 0;
    }
    toMetricData(_descriptor, _aggregationTemporality, _accumulationByAttributes, _endTime) {
      return void 0;
    }
  };
  function createNewEmptyCheckpoint(boundaries) {
    const counts = boundaries.map(() => 0);
    counts.push(0);
    return {
      buckets: {
        boundaries,
        counts
      },
      sum: 0,
      count: 0,
      hasMinMax: false,
      min: Infinity,
      max: -Infinity
    };
  }
  var HistogramAccumulation = class {
    startTime;
    _boundaries;
    _recordMinMax;
    _current;
    constructor(startTime, _boundaries, _recordMinMax = true, _current = createNewEmptyCheckpoint(_boundaries)) {
      this.startTime = startTime;
      this._boundaries = _boundaries;
      this._recordMinMax = _recordMinMax;
      this._current = _current;
    }
    record(value) {
      if (Number.isNaN(value)) {
        return;
      }
      this._current.count += 1;
      this._current.sum += value;
      if (this._recordMinMax) {
        this._current.min = Math.min(value, this._current.min);
        this._current.max = Math.max(value, this._current.max);
        this._current.hasMinMax = true;
      }
      const idx = binarySearchUB(this._boundaries, value);
      this._current.buckets.counts[idx] += 1;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var HistogramAggregator = class {
    _boundaries;
    _recordMinMax;
    kind = AggregatorKind.HISTOGRAM;
    /**
     * @param _boundaries sorted upper bounds of recorded values.
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(_boundaries, _recordMinMax) {
      this._boundaries = _boundaries;
      this._recordMinMax = _recordMinMax;
    }
    createAccumulation(startTime) {
      return new HistogramAccumulation(startTime, this._boundaries, this._recordMinMax);
    }
    /**
     * Return the result of the merge of two histogram accumulations. As long as one Aggregator
     * instance produces all Accumulations with constant boundaries we don't need to worry about
     * merging accumulations with different boundaries.
     */
    merge(previous, delta) {
      const previousValue = previous.toPointValue();
      const deltaValue = delta.toPointValue();
      const previousCounts = previousValue.buckets.counts;
      const deltaCounts = deltaValue.buckets.counts;
      const mergedCounts = new Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++) {
        mergedCounts[idx] = previousCounts[idx] + deltaCounts[idx];
      }
      let min = Infinity;
      let max = -Infinity;
      if (this._recordMinMax) {
        if (previousValue.hasMinMax && deltaValue.hasMinMax) {
          min = Math.min(previousValue.min, deltaValue.min);
          max = Math.max(previousValue.max, deltaValue.max);
        } else if (previousValue.hasMinMax) {
          min = previousValue.min;
          max = previousValue.max;
        } else if (deltaValue.hasMinMax) {
          min = deltaValue.min;
          max = deltaValue.max;
        }
      }
      return new HistogramAccumulation(previous.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
        buckets: {
          boundaries: previousValue.buckets.boundaries,
          counts: mergedCounts
        },
        count: previousValue.count + deltaValue.count,
        sum: previousValue.sum + deltaValue.sum,
        hasMinMax: this._recordMinMax && (previousValue.hasMinMax || deltaValue.hasMinMax),
        min,
        max
      });
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const previousValue = previous.toPointValue();
      const currentValue = current.toPointValue();
      const previousCounts = previousValue.buckets.counts;
      const currentCounts = currentValue.buckets.counts;
      const diffedCounts = new Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++) {
        diffedCounts[idx] = currentCounts[idx] - previousCounts[idx];
      }
      return new HistogramAccumulation(current.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
        buckets: {
          boundaries: previousValue.buckets.boundaries,
          counts: diffedCounts
        },
        count: currentValue.count - previousValue.count,
        sum: currentValue.sum - previousValue.sum,
        hasMinMax: false,
        min: Infinity,
        max: -Infinity
      });
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType2.HISTOGRAM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          const pointValue = accumulation.toPointValue();
          const allowsNegativeValues = descriptor.type === InstrumentType2.GAUGE || descriptor.type === InstrumentType2.UP_DOWN_COUNTER || descriptor.type === InstrumentType2.OBSERVABLE_GAUGE || descriptor.type === InstrumentType2.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: {
              min: pointValue.hasMinMax ? pointValue.min : void 0,
              max: pointValue.hasMinMax ? pointValue.max : void 0,
              sum: !allowsNegativeValues ? pointValue.sum : void 0,
              buckets: pointValue.buckets,
              count: pointValue.count
            }
          };
        })
      };
    }
  };
  var Buckets = class _Buckets {
    backing;
    indexBase;
    indexStart;
    indexEnd;
    /**
     * The term index refers to the number of the exponential histogram bucket
     * used to determine its boundaries. The lower boundary of a bucket is
     * determined by base ** index and the upper boundary of a bucket is
     * determined by base ** (index + 1). index values are signed to account
     * for values less than or equal to 1.
     *
     * indexBase is the index of the 0th position in the
     * backing array, i.e., backing[0] is the count
     * in the bucket with index `indexBase`.
     *
     * indexStart is the smallest index value represented
     * in the backing array.
     *
     * indexEnd is the largest index value represented in
     * the backing array.
     */
    constructor(backing = new BucketsBacking(), indexBase = 0, indexStart = 0, indexEnd = 0) {
      this.backing = backing;
      this.indexBase = indexBase;
      this.indexStart = indexStart;
      this.indexEnd = indexEnd;
    }
    /**
     * Offset is the bucket index of the smallest entry in the counts array
     * @returns {number}
     */
    get offset() {
      return this.indexStart;
    }
    /**
     * Buckets is a view into the backing array.
     * @returns {number}
     */
    get length() {
      if (this.backing.length === 0) {
        return 0;
      }
      if (this.indexEnd === this.indexStart && this.at(0) === 0) {
        return 0;
      }
      return this.indexEnd - this.indexStart + 1;
    }
    /**
     * An array of counts, where count[i] carries the count
     * of the bucket at index (offset+i).  count[i] is the count of
     * values greater than base^(offset+i) and less than or equal to
     * base^(offset+i+1).
     * @returns {number} The logical counts based on the backing array
     */
    counts() {
      return Array.from({
        length: this.length
      }, (_2, i2) => this.at(i2));
    }
    /**
     * At returns the count of the bucket at a position in the logical
     * array of counts.
     * @param position
     * @returns {number}
     */
    at(position) {
      const bias = this.indexBase - this.indexStart;
      if (position < bias) {
        position += this.backing.length;
      }
      position -= bias;
      return this.backing.countAt(position);
    }
    /**
     * incrementBucket increments the backing array index by `increment`
     * @param bucketIndex
     * @param increment
     */
    incrementBucket(bucketIndex, increment) {
      this.backing.increment(bucketIndex, increment);
    }
    /**
     * decrementBucket decrements the backing array index by `decrement`
     * if decrement is greater than the current value, it's set to 0.
     * @param bucketIndex
     * @param decrement
     */
    decrementBucket(bucketIndex, decrement) {
      this.backing.decrement(bucketIndex, decrement);
    }
    /**
     * trim removes leading and / or trailing zero buckets (which can occur
     * after diffing two histos) and rotates the backing array so that the
     * smallest non-zero index is in the 0th position of the backing array
     */
    trim() {
      for (let i2 = 0; i2 < this.length; i2++) {
        if (this.at(i2) !== 0) {
          this.indexStart += i2;
          break;
        } else if (i2 === this.length - 1) {
          this.indexStart = this.indexEnd = this.indexBase = 0;
          return;
        }
      }
      for (let i2 = this.length - 1; i2 >= 0; i2--) {
        if (this.at(i2) !== 0) {
          this.indexEnd -= this.length - i2 - 1;
          break;
        }
      }
      this._rotate();
    }
    /**
     * downscale first rotates, then collapses 2**`by`-to-1 buckets.
     * @param by
     */
    downscale(by) {
      this._rotate();
      const size = 1 + this.indexEnd - this.indexStart;
      const each = 1 << by;
      let inpos = 0;
      let outpos = 0;
      for (let pos = this.indexStart; pos <= this.indexEnd; ) {
        let mod = pos % each;
        if (mod < 0) {
          mod += each;
        }
        for (let i2 = mod; i2 < each && inpos < size; i2++) {
          this._relocateBucket(outpos, inpos);
          inpos++;
          pos++;
        }
        outpos++;
      }
      this.indexStart >>= by;
      this.indexEnd >>= by;
      this.indexBase = this.indexStart;
    }
    /**
     * Clone returns a deep copy of Buckets
     * @returns {Buckets}
     */
    clone() {
      return new _Buckets(this.backing.clone(), this.indexBase, this.indexStart, this.indexEnd);
    }
    /**
     * _rotate shifts the backing array contents so that indexStart ==
     * indexBase to simplify the downscale logic.
     */
    _rotate() {
      const bias = this.indexBase - this.indexStart;
      if (bias === 0) {
        return;
      } else if (bias > 0) {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, bias);
        this.backing.reverse(bias, this.backing.length);
      } else {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, this.backing.length + bias);
      }
      this.indexBase = this.indexStart;
    }
    /**
     * _relocateBucket adds the count in counts[src] to counts[dest] and
     * resets count[src] to zero.
     */
    _relocateBucket(dest, src) {
      if (dest === src) {
        return;
      }
      this.incrementBucket(dest, this.backing.emptyBucket(src));
    }
  };
  var BucketsBacking = class _BucketsBacking {
    _counts;
    constructor(_counts = [0]) {
      this._counts = _counts;
    }
    /**
     * length returns the physical size of the backing array, which
     * is >= buckets.length()
     */
    get length() {
      return this._counts.length;
    }
    /**
     * countAt returns the count in a specific bucket
     */
    countAt(pos) {
      return this._counts[pos];
    }
    /**
     * growTo grows a backing array and copies old entries
     * into their correct new positions.
     */
    growTo(newSize, oldPositiveLimit, newPositiveLimit) {
      const tmp = new Array(newSize).fill(0);
      tmp.splice(newPositiveLimit, this._counts.length - oldPositiveLimit, ...this._counts.slice(oldPositiveLimit));
      tmp.splice(0, oldPositiveLimit, ...this._counts.slice(0, oldPositiveLimit));
      this._counts = tmp;
    }
    /**
     * reverse the items in the backing array in the range [from, limit).
     */
    reverse(from, limit) {
      const num = Math.floor((from + limit) / 2) - from;
      for (let i2 = 0; i2 < num; i2++) {
        const tmp = this._counts[from + i2];
        this._counts[from + i2] = this._counts[limit - i2 - 1];
        this._counts[limit - i2 - 1] = tmp;
      }
    }
    /**
     * emptyBucket empties the count from a bucket, for
     * moving into another.
     */
    emptyBucket(src) {
      const tmp = this._counts[src];
      this._counts[src] = 0;
      return tmp;
    }
    /**
     * increments a bucket by `increment`
     */
    increment(bucketIndex, increment) {
      this._counts[bucketIndex] += increment;
    }
    /**
     * decrements a bucket by `decrement`
     */
    decrement(bucketIndex, decrement) {
      if (this._counts[bucketIndex] >= decrement) {
        this._counts[bucketIndex] -= decrement;
      } else {
        this._counts[bucketIndex] = 0;
      }
    }
    /**
     * clone returns a deep copy of BucketsBacking
     */
    clone() {
      return new _BucketsBacking([...this._counts]);
    }
  };
  var SIGNIFICAND_WIDTH = 52;
  var EXPONENT_MASK = 2146435072;
  var SIGNIFICAND_MASK = 1048575;
  var EXPONENT_BIAS = 1023;
  var MIN_NORMAL_EXPONENT = -EXPONENT_BIAS + 1;
  var MAX_NORMAL_EXPONENT = EXPONENT_BIAS;
  var MIN_VALUE = Math.pow(2, -1022);
  function getNormalBase2(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    const hiBits = dv.getUint32(0);
    const expBits = (hiBits & EXPONENT_MASK) >> 20;
    return expBits - EXPONENT_BIAS;
  }
  function getSignificand(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    const hiBits = dv.getUint32(0);
    const loBits = dv.getUint32(4);
    const significandHiBits = (hiBits & SIGNIFICAND_MASK) * Math.pow(2, 32);
    return significandHiBits + loBits;
  }
  function ldexp(frac, exp) {
    if (frac === 0 || frac === Number.POSITIVE_INFINITY || frac === Number.NEGATIVE_INFINITY || Number.isNaN(frac)) {
      return frac;
    }
    return frac * Math.pow(2, exp);
  }
  function nextGreaterSquare(v2) {
    v2--;
    v2 |= v2 >> 1;
    v2 |= v2 >> 2;
    v2 |= v2 >> 4;
    v2 |= v2 >> 8;
    v2 |= v2 >> 16;
    v2++;
    return v2;
  }
  var MappingError = class extends Error {
  };
  var ExponentMapping = class {
    _shift;
    constructor(scale) {
      this._shift = -scale;
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
      if (value < MIN_VALUE) {
        return this._minNormalLowerBoundaryIndex();
      }
      const exp = getNormalBase2(value);
      const correction = this._rightShift(getSignificand(value) - 1, SIGNIFICAND_WIDTH);
      return exp + correction >> this._shift;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
      const minIndex = this._minNormalLowerBoundaryIndex();
      if (index < minIndex) {
        throw new MappingError(`underflow: ${index} is < minimum lower boundary: ${minIndex}`);
      }
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index > maxIndex) {
        throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      }
      return ldexp(1, index << this._shift);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
      if (this._shift === 0) {
        return 0;
      }
      return -this._shift;
    }
    _minNormalLowerBoundaryIndex() {
      let index = MIN_NORMAL_EXPONENT >> this._shift;
      if (this._shift < 2) {
        index--;
      }
      return index;
    }
    _maxNormalLowerBoundaryIndex() {
      return MAX_NORMAL_EXPONENT >> this._shift;
    }
    _rightShift(value, shift) {
      return Math.floor(value * Math.pow(2, -shift));
    }
  };
  var LogarithmMapping = class {
    _scale;
    _scaleFactor;
    _inverseFactor;
    constructor(scale) {
      this._scale = scale;
      this._scaleFactor = ldexp(Math.LOG2E, scale);
      this._inverseFactor = ldexp(Math.LN2, -scale);
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
      if (value <= MIN_VALUE) {
        return this._minNormalLowerBoundaryIndex() - 1;
      }
      if (getSignificand(value) === 0) {
        const exp = getNormalBase2(value);
        return (exp << this._scale) - 1;
      }
      const index = Math.floor(Math.log(value) * this._scaleFactor);
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) {
        return maxIndex;
      }
      return index;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) {
        if (index === maxIndex) {
          return 2 * Math.exp((index - (1 << this._scale)) / this._scaleFactor);
        }
        throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      }
      const minIndex = this._minNormalLowerBoundaryIndex();
      if (index <= minIndex) {
        if (index === minIndex) {
          return MIN_VALUE;
        } else if (index === minIndex - 1) {
          return Math.exp((index + (1 << this._scale)) / this._scaleFactor) / 2;
        }
        throw new MappingError(`overflow: ${index} is < minimum lower boundary: ${minIndex}`);
      }
      return Math.exp(index * this._inverseFactor);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
      return this._scale;
    }
    _minNormalLowerBoundaryIndex() {
      return MIN_NORMAL_EXPONENT << this._scale;
    }
    _maxNormalLowerBoundaryIndex() {
      return (MAX_NORMAL_EXPONENT + 1 << this._scale) - 1;
    }
  };
  var MIN_SCALE = -10;
  var MAX_SCALE$1 = 20;
  var PREBUILT_MAPPINGS = Array.from({
    length: 31
  }, (_2, i2) => {
    if (i2 > 10) {
      return new LogarithmMapping(i2 - 10);
    }
    return new ExponentMapping(i2 - 10);
  });
  function getMapping(scale) {
    if (scale > MAX_SCALE$1 || scale < MIN_SCALE) {
      throw new MappingError(`expected scale >= ${MIN_SCALE} && <= ${MAX_SCALE$1}, got: ${scale}`);
    }
    return PREBUILT_MAPPINGS[scale + 10];
  }
  var HighLow = class _HighLow {
    low;
    high;
    static combine(h1, h2) {
      return new _HighLow(Math.min(h1.low, h2.low), Math.max(h1.high, h2.high));
    }
    constructor(low, high) {
      this.low = low;
      this.high = high;
    }
  };
  var MAX_SCALE = 20;
  var DEFAULT_MAX_SIZE = 160;
  var MIN_MAX_SIZE = 2;
  var ExponentialHistogramAccumulation = class _ExponentialHistogramAccumulation {
    startTime;
    _maxSize;
    _recordMinMax;
    _sum;
    _count;
    _zeroCount;
    _min;
    _max;
    _positive;
    _negative;
    _mapping;
    constructor(startTime = startTime, _maxSize = DEFAULT_MAX_SIZE, _recordMinMax = true, _sum = 0, _count = 0, _zeroCount = 0, _min = Number.POSITIVE_INFINITY, _max = Number.NEGATIVE_INFINITY, _positive = new Buckets(), _negative = new Buckets(), _mapping = getMapping(MAX_SCALE)) {
      this.startTime = startTime;
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
      this._sum = _sum;
      this._count = _count;
      this._zeroCount = _zeroCount;
      this._min = _min;
      this._max = _max;
      this._positive = _positive;
      this._negative = _negative;
      this._mapping = _mapping;
      if (this._maxSize < MIN_MAX_SIZE) {
        diag2.warn(`Exponential Histogram Max Size set to ${this._maxSize},                 changing to the minimum size of: ${MIN_MAX_SIZE}`);
        this._maxSize = MIN_MAX_SIZE;
      }
    }
    /**
     * record updates a histogram with a single count
     * @param {Number} value
     */
    record(value) {
      this.updateByIncrement(value, 1);
    }
    /**
     * Sets the start time for this accumulation
     * @param {HrTime} startTime
     */
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    /**
     * Returns the datapoint representation of this accumulation
     * @param {HrTime} startTime
     */
    toPointValue() {
      return {
        hasMinMax: this._recordMinMax,
        min: this.min,
        max: this.max,
        sum: this.sum,
        positive: {
          offset: this.positive.offset,
          bucketCounts: this.positive.counts()
        },
        negative: {
          offset: this.negative.offset,
          bucketCounts: this.negative.counts()
        },
        count: this.count,
        scale: this.scale,
        zeroCount: this.zeroCount
      };
    }
    /**
     * @returns {Number} The sum of values recorded by this accumulation
     */
    get sum() {
      return this._sum;
    }
    /**
     * @returns {Number} The minimum value recorded by this accumulation
     */
    get min() {
      return this._min;
    }
    /**
     * @returns {Number} The maximum value recorded by this accumulation
     */
    get max() {
      return this._max;
    }
    /**
     * @returns {Number} The count of values recorded by this accumulation
     */
    get count() {
      return this._count;
    }
    /**
     * @returns {Number} The number of 0 values recorded by this accumulation
     */
    get zeroCount() {
      return this._zeroCount;
    }
    /**
     * @returns {Number} The scale used by this accumulation
     */
    get scale() {
      if (this._count === this._zeroCount) {
        return 0;
      }
      return this._mapping.scale;
    }
    /**
     * positive holds the positive values
     * @returns {Buckets}
     */
    get positive() {
      return this._positive;
    }
    /**
     * negative holds the negative values by their absolute value
     * @returns {Buckets}
     */
    get negative() {
      return this._negative;
    }
    /**
     * updateByIncr supports updating a histogram with a non-negative
     * increment.
     * @param value
     * @param increment
     */
    updateByIncrement(value, increment) {
      if (Number.isNaN(value)) {
        return;
      }
      if (value > this._max) {
        this._max = value;
      }
      if (value < this._min) {
        this._min = value;
      }
      this._count += increment;
      if (value === 0) {
        this._zeroCount += increment;
        return;
      }
      this._sum += value * increment;
      if (value > 0) {
        this._updateBuckets(this._positive, value, increment);
      } else {
        this._updateBuckets(this._negative, -value, increment);
      }
    }
    /**
     * merge combines data from previous value into self
     * @param {ExponentialHistogramAccumulation} previous
     */
    merge(previous) {
      if (this._count === 0) {
        this._min = previous.min;
        this._max = previous.max;
      } else if (previous.count !== 0) {
        if (previous.min < this.min) {
          this._min = previous.min;
        }
        if (previous.max > this.max) {
          this._max = previous.max;
        }
      }
      this.startTime = previous.startTime;
      this._sum += previous.sum;
      this._count += previous.count;
      this._zeroCount += previous.zeroCount;
      const minScale = this._minScale(previous);
      this._downscale(this.scale - minScale);
      this._mergeBuckets(this.positive, previous, previous.positive, minScale);
      this._mergeBuckets(this.negative, previous, previous.negative, minScale);
    }
    /**
     * diff subtracts other from self
     * @param {ExponentialHistogramAccumulation} other
     */
    diff(other) {
      this._min = Infinity;
      this._max = -Infinity;
      this._sum -= other.sum;
      this._count -= other.count;
      this._zeroCount -= other.zeroCount;
      const minScale = this._minScale(other);
      this._downscale(this.scale - minScale);
      this._diffBuckets(this.positive, other, other.positive, minScale);
      this._diffBuckets(this.negative, other, other.negative, minScale);
    }
    /**
     * clone returns a deep copy of self
     * @returns {ExponentialHistogramAccumulation}
     */
    clone() {
      return new _ExponentialHistogramAccumulation(this.startTime, this._maxSize, this._recordMinMax, this._sum, this._count, this._zeroCount, this._min, this._max, this.positive.clone(), this.negative.clone(), this._mapping);
    }
    /**
     * _updateBuckets maps the incoming value to a bucket index for the current
     * scale. If the bucket index is outside of the range of the backing array,
     * it will rescale the backing array and update the mapping for the new scale.
     */
    _updateBuckets(buckets, value, increment) {
      let index = this._mapping.mapToIndex(value);
      let rescalingNeeded = false;
      let high = 0;
      let low = 0;
      if (buckets.length === 0) {
        buckets.indexStart = index;
        buckets.indexEnd = buckets.indexStart;
        buckets.indexBase = buckets.indexStart;
      } else if (index < buckets.indexStart && buckets.indexEnd - index >= this._maxSize) {
        rescalingNeeded = true;
        low = index;
        high = buckets.indexEnd;
      } else if (index > buckets.indexEnd && index - buckets.indexStart >= this._maxSize) {
        rescalingNeeded = true;
        low = buckets.indexStart;
        high = index;
      }
      if (rescalingNeeded) {
        const change = this._changeScale(high, low);
        this._downscale(change);
        index = this._mapping.mapToIndex(value);
      }
      this._incrementIndexBy(buckets, index, increment);
    }
    /**
     * _incrementIndexBy increments the count of the bucket specified by `index`.
     * If the index is outside of the range [buckets.indexStart, buckets.indexEnd]
     * the boundaries of the backing array will be adjusted and more buckets will
     * be added if needed.
     */
    _incrementIndexBy(buckets, index, increment) {
      if (increment === 0) {
        return;
      }
      if (buckets.length === 0) {
        buckets.indexStart = buckets.indexEnd = buckets.indexBase = index;
      }
      if (index < buckets.indexStart) {
        const span = buckets.indexEnd - index;
        if (span >= buckets.backing.length) {
          this._grow(buckets, span + 1);
        }
        buckets.indexStart = index;
      } else if (index > buckets.indexEnd) {
        const span = index - buckets.indexStart;
        if (span >= buckets.backing.length) {
          this._grow(buckets, span + 1);
        }
        buckets.indexEnd = index;
      }
      let bucketIndex = index - buckets.indexBase;
      if (bucketIndex < 0) {
        bucketIndex += buckets.backing.length;
      }
      buckets.incrementBucket(bucketIndex, increment);
    }
    /**
     * grow resizes the backing array by doubling in size up to maxSize.
     * This extends the array with a bunch of zeros and copies the
     * existing counts to the same position.
     */
    _grow(buckets, needed) {
      const size = buckets.backing.length;
      const bias = buckets.indexBase - buckets.indexStart;
      const oldPositiveLimit = size - bias;
      let newSize = nextGreaterSquare(needed);
      if (newSize > this._maxSize) {
        newSize = this._maxSize;
      }
      const newPositiveLimit = newSize - bias;
      buckets.backing.growTo(newSize, oldPositiveLimit, newPositiveLimit);
    }
    /**
     * _changeScale computes how much downscaling is needed by shifting the
     * high and low values until they are separated by no more than size.
     */
    _changeScale(high, low) {
      let change = 0;
      while (high - low >= this._maxSize) {
        high >>= 1;
        low >>= 1;
        change++;
      }
      return change;
    }
    /**
     * _downscale subtracts `change` from the current mapping scale.
     */
    _downscale(change) {
      if (change === 0) {
        return;
      }
      if (change < 0) {
        throw new Error(`impossible change of scale: ${this.scale}`);
      }
      const newScale = this._mapping.scale - change;
      this._positive.downscale(change);
      this._negative.downscale(change);
      this._mapping = getMapping(newScale);
    }
    /**
     * _minScale is used by diff and merge to compute an ideal combined scale
     */
    _minScale(other) {
      const minScale = Math.min(this.scale, other.scale);
      const highLowPos = HighLow.combine(this._highLowAtScale(this.positive, this.scale, minScale), this._highLowAtScale(other.positive, other.scale, minScale));
      const highLowNeg = HighLow.combine(this._highLowAtScale(this.negative, this.scale, minScale), this._highLowAtScale(other.negative, other.scale, minScale));
      return Math.min(minScale - this._changeScale(highLowPos.high, highLowPos.low), minScale - this._changeScale(highLowNeg.high, highLowNeg.low));
    }
    /**
     * _highLowAtScale is used by diff and merge to compute an ideal combined scale.
     */
    _highLowAtScale(buckets, currentScale, newScale) {
      if (buckets.length === 0) {
        return new HighLow(0, -1);
      }
      const shift = currentScale - newScale;
      return new HighLow(buckets.indexStart >> shift, buckets.indexEnd >> shift);
    }
    /**
     * _mergeBuckets translates index values from another histogram and
     * adds the values into the corresponding buckets of this histogram.
     */
    _mergeBuckets(ours, other, theirs, scale) {
      const theirOffset = theirs.offset;
      const theirChange = other.scale - scale;
      for (let i2 = 0; i2 < theirs.length; i2++) {
        this._incrementIndexBy(ours, theirOffset + i2 >> theirChange, theirs.at(i2));
      }
    }
    /**
     * _diffBuckets translates index values from another histogram and
     * subtracts the values in the corresponding buckets of this histogram.
     */
    _diffBuckets(ours, other, theirs, scale) {
      const theirOffset = theirs.offset;
      const theirChange = other.scale - scale;
      for (let i2 = 0; i2 < theirs.length; i2++) {
        const ourIndex = theirOffset + i2 >> theirChange;
        let bucketIndex = ourIndex - ours.indexBase;
        if (bucketIndex < 0) {
          bucketIndex += ours.backing.length;
        }
        ours.decrementBucket(bucketIndex, theirs.at(i2));
      }
      ours.trim();
    }
  };
  var ExponentialHistogramAggregator = class {
    _maxSize;
    _recordMinMax;
    kind = AggregatorKind.EXPONENTIAL_HISTOGRAM;
    /**
     * @param _maxSize Maximum number of buckets for each of the positive
     *    and negative ranges, exclusive of the zero-bucket.
     * @param _recordMinMax If set to true, min and max will be recorded.
     *    Otherwise, min and max will not be recorded.
     */
    constructor(_maxSize, _recordMinMax) {
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
    }
    createAccumulation(startTime) {
      return new ExponentialHistogramAccumulation(startTime, this._maxSize, this._recordMinMax);
    }
    /**
     * Return the result of the merge of two exponential histogram accumulations.
     */
    merge(previous, delta) {
      const result = delta.clone();
      result.merge(previous);
      return result;
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const result = current.clone();
      result.diff(previous);
      return result;
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType2.EXPONENTIAL_HISTOGRAM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          const pointValue = accumulation.toPointValue();
          const allowsNegativeValues = descriptor.type === InstrumentType2.GAUGE || descriptor.type === InstrumentType2.UP_DOWN_COUNTER || descriptor.type === InstrumentType2.OBSERVABLE_GAUGE || descriptor.type === InstrumentType2.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: {
              min: pointValue.hasMinMax ? pointValue.min : void 0,
              max: pointValue.hasMinMax ? pointValue.max : void 0,
              sum: !allowsNegativeValues ? pointValue.sum : void 0,
              positive: {
                offset: pointValue.positive.offset,
                bucketCounts: pointValue.positive.bucketCounts
              },
              negative: {
                offset: pointValue.negative.offset,
                bucketCounts: pointValue.negative.bucketCounts
              },
              count: pointValue.count,
              scale: pointValue.scale,
              zeroCount: pointValue.zeroCount
            }
          };
        })
      };
    }
  };
  var LastValueAccumulation = class {
    startTime;
    _current;
    sampleTime;
    constructor(startTime, _current = 0, sampleTime = [0, 0]) {
      this.startTime = startTime;
      this._current = _current;
      this.sampleTime = sampleTime;
    }
    record(value) {
      this._current = value;
      this.sampleTime = millisToHrTime(Date.now());
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var LastValueAggregator = class {
    kind = AggregatorKind.LAST_VALUE;
    createAccumulation(startTime) {
      return new LastValueAccumulation(startTime);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     *
     * Return the newly captured (delta) accumulation for LastValueAggregator.
     */
    merge(previous, delta) {
      const latestAccumulation = hrTimeToMicroseconds(delta.sampleTime) >= hrTimeToMicroseconds(previous.sampleTime) ? delta : previous;
      return new LastValueAccumulation(previous.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     *
     * A delta aggregation is not meaningful to LastValueAggregator, just return
     * the newly captured (delta) accumulation for LastValueAggregator.
     */
    diff(previous, current) {
      const latestAccumulation = hrTimeToMicroseconds(current.sampleTime) >= hrTimeToMicroseconds(previous.sampleTime) ? current : previous;
      return new LastValueAccumulation(current.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType2.GAUGE,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: accumulation.toPointValue()
          };
        })
      };
    }
  };
  var SumAccumulation = class {
    startTime;
    monotonic;
    _current;
    reset;
    constructor(startTime, monotonic, _current = 0, reset = false) {
      this.startTime = startTime;
      this.monotonic = monotonic;
      this._current = _current;
      this.reset = reset;
    }
    record(value) {
      if (this.monotonic && value < 0) {
        return;
      }
      this._current += value;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var SumAggregator = class {
    monotonic;
    kind = AggregatorKind.SUM;
    constructor(monotonic) {
      this.monotonic = monotonic;
    }
    createAccumulation(startTime) {
      return new SumAccumulation(startTime, this.monotonic);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     */
    merge(previous, delta) {
      const prevPv = previous.toPointValue();
      const deltaPv = delta.toPointValue();
      if (delta.reset) {
        return new SumAccumulation(delta.startTime, this.monotonic, deltaPv, delta.reset);
      }
      return new SumAccumulation(previous.startTime, this.monotonic, prevPv + deltaPv);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const prevPv = previous.toPointValue();
      const currPv = current.toPointValue();
      if (this.monotonic && prevPv > currPv) {
        return new SumAccumulation(current.startTime, this.monotonic, currPv, true);
      }
      return new SumAccumulation(current.startTime, this.monotonic, currPv - prevPv);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType2.SUM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: accumulation.toPointValue()
          };
        }),
        isMonotonic: this.monotonic
      };
    }
  };
  var DropAggregation = class _DropAggregation {
    static DEFAULT_INSTANCE = new DropAggregator();
    createAggregator(_instrument) {
      return _DropAggregation.DEFAULT_INSTANCE;
    }
  };
  var SumAggregation = class _SumAggregation {
    static MONOTONIC_INSTANCE = new SumAggregator(true);
    static NON_MONOTONIC_INSTANCE = new SumAggregator(false);
    createAggregator(instrument) {
      switch (instrument.type) {
        case InstrumentType2.COUNTER:
        case InstrumentType2.OBSERVABLE_COUNTER:
        case InstrumentType2.HISTOGRAM: {
          return _SumAggregation.MONOTONIC_INSTANCE;
        }
        default: {
          return _SumAggregation.NON_MONOTONIC_INSTANCE;
        }
      }
    }
  };
  var LastValueAggregation = class _LastValueAggregation {
    static DEFAULT_INSTANCE = new LastValueAggregator();
    createAggregator(_instrument) {
      return _LastValueAggregation.DEFAULT_INSTANCE;
    }
  };
  var HistogramAggregation = class _HistogramAggregation {
    static DEFAULT_INSTANCE = new HistogramAggregator([0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1e3, 2500, 5e3, 7500, 1e4], true);
    createAggregator(_instrument) {
      return _HistogramAggregation.DEFAULT_INSTANCE;
    }
  };
  var ExplicitBucketHistogramAggregation = class {
    _recordMinMax;
    _boundaries;
    /**
     * @param boundaries the bucket boundaries of the histogram aggregation
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(boundaries, _recordMinMax = true) {
      this._recordMinMax = _recordMinMax;
      if (boundaries == null) {
        throw new Error("ExplicitBucketHistogramAggregation should be created with explicit boundaries, if a single bucket histogram is required, please pass an empty array");
      }
      boundaries = boundaries.concat();
      boundaries = boundaries.sort((a2, b2) => a2 - b2);
      const minusInfinityIndex = boundaries.lastIndexOf(-Infinity);
      let infinityIndex = boundaries.indexOf(Infinity);
      if (infinityIndex === -1) {
        infinityIndex = void 0;
      }
      this._boundaries = boundaries.slice(minusInfinityIndex + 1, infinityIndex);
    }
    createAggregator(_instrument) {
      return new HistogramAggregator(this._boundaries, this._recordMinMax);
    }
  };
  var ExponentialHistogramAggregation = class {
    _maxSize;
    _recordMinMax;
    constructor(_maxSize = 160, _recordMinMax = true) {
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
    }
    createAggregator(_instrument) {
      return new ExponentialHistogramAggregator(this._maxSize, this._recordMinMax);
    }
  };
  var DefaultAggregation = class {
    _resolve(instrument) {
      switch (instrument.type) {
        case InstrumentType2.COUNTER:
        case InstrumentType2.UP_DOWN_COUNTER:
        case InstrumentType2.OBSERVABLE_COUNTER:
        case InstrumentType2.OBSERVABLE_UP_DOWN_COUNTER: {
          return SUM_AGGREGATION;
        }
        case InstrumentType2.GAUGE:
        case InstrumentType2.OBSERVABLE_GAUGE: {
          return LAST_VALUE_AGGREGATION;
        }
        case InstrumentType2.HISTOGRAM: {
          if (instrument.advice.explicitBucketBoundaries) {
            return new ExplicitBucketHistogramAggregation(instrument.advice.explicitBucketBoundaries);
          }
          return HISTOGRAM_AGGREGATION;
        }
      }
      diag2.warn(`Unable to recognize instrument type: ${instrument.type}`);
      return DROP_AGGREGATION;
    }
    createAggregator(instrument) {
      return this._resolve(instrument).createAggregator(instrument);
    }
  };
  var DROP_AGGREGATION = new DropAggregation();
  var SUM_AGGREGATION = new SumAggregation();
  var LAST_VALUE_AGGREGATION = new LastValueAggregation();
  var HISTOGRAM_AGGREGATION = new HistogramAggregation();
  var DEFAULT_AGGREGATION2 = new DefaultAggregation();
  var AggregationType2;
  (function(AggregationType3) {
    AggregationType3[AggregationType3["DEFAULT"] = 0] = "DEFAULT";
    AggregationType3[AggregationType3["DROP"] = 1] = "DROP";
    AggregationType3[AggregationType3["SUM"] = 2] = "SUM";
    AggregationType3[AggregationType3["LAST_VALUE"] = 3] = "LAST_VALUE";
    AggregationType3[AggregationType3["EXPLICIT_BUCKET_HISTOGRAM"] = 4] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType3[AggregationType3["EXPONENTIAL_HISTOGRAM"] = 5] = "EXPONENTIAL_HISTOGRAM";
  })(AggregationType2 || (AggregationType2 = {}));
  function toAggregation(option) {
    switch (option.type) {
      case AggregationType2.DEFAULT:
        return DEFAULT_AGGREGATION2;
      case AggregationType2.DROP:
        return DROP_AGGREGATION;
      case AggregationType2.SUM:
        return SUM_AGGREGATION;
      case AggregationType2.LAST_VALUE:
        return LAST_VALUE_AGGREGATION;
      case AggregationType2.EXPONENTIAL_HISTOGRAM: {
        const expOption = option;
        return new ExponentialHistogramAggregation(expOption.options?.maxSize, expOption.options?.recordMinMax);
      }
      case AggregationType2.EXPLICIT_BUCKET_HISTOGRAM: {
        const expOption = option;
        if (expOption.options == null) {
          return HISTOGRAM_AGGREGATION;
        } else {
          return new ExplicitBucketHistogramAggregation(expOption.options?.boundaries, expOption.options?.recordMinMax);
        }
      }
      default:
        throw new Error("Unsupported Aggregation");
    }
  }
  var DEFAULT_AGGREGATION_SELECTOR = (_instrumentType) => {
    return {
      type: AggregationType2.DEFAULT
    };
  };
  var DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = (_instrumentType) => AggregationTemporality2.CUMULATIVE;
  var MetricReader = class {
    // Tracks the shutdown state.
    // TODO: use BindOncePromise here once a new version of @opentelemetry/core is available.
    _shutdown = false;
    // Additional MetricProducers which will be combined with the SDK's output
    _metricProducers;
    // MetricProducer used by this instance which produces metrics from the SDK
    _sdkMetricProducer;
    _aggregationTemporalitySelector;
    _aggregationSelector;
    _cardinalitySelector;
    constructor(options) {
      this._aggregationSelector = options?.aggregationSelector ?? DEFAULT_AGGREGATION_SELECTOR;
      this._aggregationTemporalitySelector = options?.aggregationTemporalitySelector ?? DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
      this._metricProducers = options?.metricProducers ?? [];
      this._cardinalitySelector = options?.cardinalitySelector;
    }
    setMetricProducer(metricProducer) {
      if (this._sdkMetricProducer) {
        throw new Error("MetricReader can not be bound to a MeterProvider again.");
      }
      this._sdkMetricProducer = metricProducer;
      this.onInitialized();
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
    selectCardinalityLimit(instrumentType) {
      return this._cardinalitySelector ? this._cardinalitySelector(instrumentType) : 2e3;
    }
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    onInitialized() {
    }
    async collect(options) {
      if (this._sdkMetricProducer === void 0) {
        throw new Error("MetricReader is not bound to a MetricProducer");
      }
      if (this._shutdown) {
        throw new Error("MetricReader is shutdown");
      }
      const [sdkCollectionResults, ...additionalCollectionResults] = await Promise.all([this._sdkMetricProducer.collect({
        timeoutMillis: options?.timeoutMillis
      }), ...this._metricProducers.map((producer) => producer.collect({
        timeoutMillis: options?.timeoutMillis
      }))]);
      const errors = sdkCollectionResults.errors.concat(FlatMap(additionalCollectionResults, (result) => result.errors));
      const resource = sdkCollectionResults.resourceMetrics.resource;
      const scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat(FlatMap(additionalCollectionResults, (result) => result.resourceMetrics.scopeMetrics));
      return {
        resourceMetrics: {
          resource,
          scopeMetrics
        },
        errors
      };
    }
    async shutdown(options) {
      if (this._shutdown) {
        diag2.error("Cannot call shutdown twice.");
        return;
      }
      if (options?.timeoutMillis == null) {
        await this.onShutdown();
      } else {
        await callWithTimeout2(this.onShutdown(), options.timeoutMillis);
      }
      this._shutdown = true;
    }
    async forceFlush(options) {
      if (this._shutdown) {
        diag2.warn("Cannot forceFlush on already shutdown MetricReader.");
        return;
      }
      if (options?.timeoutMillis == null) {
        await this.onForceFlush();
        return;
      }
      await callWithTimeout2(this.onForceFlush(), options.timeoutMillis);
    }
  };
  var PeriodicExportingMetricReader = class extends MetricReader {
    _interval;
    _exporter;
    _exportInterval;
    _exportTimeout;
    constructor(options) {
      super({
        aggregationSelector: options.exporter.selectAggregation?.bind(options.exporter),
        aggregationTemporalitySelector: options.exporter.selectAggregationTemporality?.bind(options.exporter),
        metricProducers: options.metricProducers
      });
      if (options.exportIntervalMillis !== void 0 && options.exportIntervalMillis <= 0) {
        throw Error("exportIntervalMillis must be greater than 0");
      }
      if (options.exportTimeoutMillis !== void 0 && options.exportTimeoutMillis <= 0) {
        throw Error("exportTimeoutMillis must be greater than 0");
      }
      if (options.exportTimeoutMillis !== void 0 && options.exportIntervalMillis !== void 0 && options.exportIntervalMillis < options.exportTimeoutMillis) {
        throw Error("exportIntervalMillis must be greater than or equal to exportTimeoutMillis");
      }
      this._exportInterval = options.exportIntervalMillis ?? 6e4;
      this._exportTimeout = options.exportTimeoutMillis ?? 3e4;
      this._exporter = options.exporter;
    }
    async _runOnce() {
      try {
        await callWithTimeout2(this._doRun(), this._exportTimeout);
      } catch (err) {
        if (err instanceof TimeoutError2) {
          diag2.error("Export took longer than %s milliseconds and timed out.", this._exportTimeout);
          return;
        }
        globalErrorHandler(err);
      }
    }
    async _doRun() {
      const {
        resourceMetrics,
        errors
      } = await this.collect({
        timeoutMillis: this._exportTimeout
      });
      if (errors.length > 0) {
        diag2.error("PeriodicExportingMetricReader: metrics collection errors", ...errors);
      }
      if (resourceMetrics.resource.asyncAttributesPending) {
        try {
          await resourceMetrics.resource.waitForAsyncAttributes?.();
        } catch (e2) {
          diag2.debug("Error while resolving async portion of resource: ", e2);
          globalErrorHandler(e2);
        }
      }
      if (resourceMetrics.scopeMetrics.length === 0) {
        return;
      }
      const result = await internal._export(this._exporter, resourceMetrics);
      if (result.code !== ExportResultCode.SUCCESS) {
        throw new Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
      }
    }
    onInitialized() {
      this._interval = setInterval(() => {
        void this._runOnce();
      }, this._exportInterval);
      unrefTimer(this._interval);
    }
    async onForceFlush() {
      await this._runOnce();
      await this._exporter.forceFlush();
    }
    async onShutdown() {
      if (this._interval) {
        clearInterval(this._interval);
      }
      await this.onForceFlush();
      await this._exporter.shutdown();
    }
  };
  var ConsoleMetricExporter = class _ConsoleMetricExporter {
    _shutdown = false;
    _temporalitySelector;
    constructor(options) {
      this._temporalitySelector = options?.temporalitySelector ?? DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
    }
    export(metrics2, resultCallback) {
      if (this._shutdown) {
        setImmediate(resultCallback, {
          code: ExportResultCode.FAILED
        });
        return;
      }
      return _ConsoleMetricExporter._sendMetrics(metrics2, resultCallback);
    }
    forceFlush() {
      return Promise.resolve();
    }
    selectAggregationTemporality(_instrumentType) {
      return this._temporalitySelector(_instrumentType);
    }
    shutdown() {
      this._shutdown = true;
      return Promise.resolve();
    }
    static _sendMetrics(metrics2, done) {
      for (const scopeMetrics of metrics2.scopeMetrics) {
        for (const metric of scopeMetrics.metrics) {
          console.dir({
            descriptor: metric.descriptor,
            dataPointType: metric.dataPointType,
            dataPoints: metric.dataPoints
          }, {
            depth: null
          });
        }
      }
      done({
        code: ExportResultCode.SUCCESS
      });
    }
  };
  var ViewRegistry = class {
    _registeredViews = [];
    addView(view) {
      this._registeredViews.push(view);
    }
    findViews(instrument, meter) {
      const views = this._registeredViews.filter((registeredView) => {
        return this._matchInstrument(registeredView.instrumentSelector, instrument) && this._matchMeter(registeredView.meterSelector, meter);
      });
      return views;
    }
    _matchInstrument(selector, instrument) {
      return (selector.getType() === void 0 || instrument.type === selector.getType()) && selector.getNameFilter().match(instrument.name) && selector.getUnitFilter().match(instrument.unit);
    }
    _matchMeter(selector, meter) {
      return selector.getNameFilter().match(meter.name) && (meter.version === void 0 || selector.getVersionFilter().match(meter.version)) && (meter.schemaUrl === void 0 || selector.getSchemaUrlFilter().match(meter.schemaUrl));
    }
  };
  function createInstrumentDescriptor(name, type, options) {
    if (!isValidName(name)) {
      diag2.warn(`Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`);
    }
    return {
      name,
      type,
      description: options?.description ?? "",
      unit: options?.unit ?? "",
      valueType: options?.valueType ?? ValueType.DOUBLE,
      advice: options?.advice ?? {}
    };
  }
  function createInstrumentDescriptorWithView(view, instrument) {
    return {
      name: view.name ?? instrument.name,
      description: view.description ?? instrument.description,
      type: instrument.type,
      unit: instrument.unit,
      valueType: instrument.valueType,
      advice: instrument.advice
    };
  }
  function isDescriptorCompatibleWith(descriptor, otherDescriptor) {
    return equalsCaseInsensitive(descriptor.name, otherDescriptor.name) && descriptor.unit === otherDescriptor.unit && descriptor.type === otherDescriptor.type && descriptor.valueType === otherDescriptor.valueType;
  }
  var NAME_REGEXP = /^[a-z][a-z0-9_.\-/]{0,254}$/i;
  function isValidName(name) {
    return name.match(NAME_REGEXP) != null;
  }
  var SyncInstrument = class {
    _writableMetricStorage;
    _descriptor;
    constructor(_writableMetricStorage, _descriptor) {
      this._writableMetricStorage = _writableMetricStorage;
      this._descriptor = _descriptor;
    }
    _record(value, attributes = {}, context$1 = context.active()) {
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${this._descriptor.name}: ${value}`);
        return;
      }
      if (this._descriptor.valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${this._descriptor.name}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      this._writableMetricStorage.record(value, attributes, context$1, millisToHrTime(Date.now()));
    }
  };
  var UpDownCounterInstrument = class extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  };
  var CounterInstrument = class extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    add(value, attributes, ctx) {
      if (value < 0) {
        diag2.warn(`negative value provided to counter ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  };
  var GaugeInstrument = class extends SyncInstrument {
    /**
     * Records a measurement.
     */
    record(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  };
  var HistogramInstrument = class extends SyncInstrument {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value, attributes, ctx) {
      if (value < 0) {
        diag2.warn(`negative value provided to histogram ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  };
  var ObservableInstrument = class {
    _observableRegistry;
    /** @internal */
    _metricStorages;
    /** @internal */
    _descriptor;
    constructor(descriptor, metricStorages, _observableRegistry) {
      this._observableRegistry = _observableRegistry;
      this._descriptor = descriptor;
      this._metricStorages = metricStorages;
    }
    /**
     * @see {Observable.addCallback}
     */
    addCallback(callback) {
      this._observableRegistry.addCallback(callback, this);
    }
    /**
     * @see {Observable.removeCallback}
     */
    removeCallback(callback) {
      this._observableRegistry.removeCallback(callback, this);
    }
  };
  var ObservableCounterInstrument = class extends ObservableInstrument {
  };
  var ObservableGaugeInstrument = class extends ObservableInstrument {
  };
  var ObservableUpDownCounterInstrument = class extends ObservableInstrument {
  };
  function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
  }
  var Meter = class {
    _meterSharedState;
    constructor(_meterSharedState) {
      this._meterSharedState = _meterSharedState;
    }
    /**
     * Create a {@link Gauge} instrument.
     */
    createGauge(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.GAUGE, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new GaugeInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Histogram} instrument.
     */
    createHistogram(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.HISTOGRAM, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new HistogramInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Counter} instrument.
     */
    createCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.COUNTER, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new CounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    createUpDownCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.UP_DOWN_COUNTER, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new UpDownCounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    createObservableGauge(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.OBSERVABLE_GAUGE, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableGaugeInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    createObservableCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.OBSERVABLE_COUNTER, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    createObservableUpDownCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType2.OBSERVABLE_UP_DOWN_COUNTER, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableUpDownCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    addBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.addBatchCallback(callback, observables);
    }
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    removeBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.removeBatchCallback(callback, observables);
    }
  };
  var MetricStorage = class {
    _instrumentDescriptor;
    constructor(_instrumentDescriptor) {
      this._instrumentDescriptor = _instrumentDescriptor;
    }
    getInstrumentDescriptor() {
      return this._instrumentDescriptor;
    }
    updateDescription(description) {
      this._instrumentDescriptor = createInstrumentDescriptor(this._instrumentDescriptor.name, this._instrumentDescriptor.type, {
        description,
        valueType: this._instrumentDescriptor.valueType,
        unit: this._instrumentDescriptor.unit,
        advice: this._instrumentDescriptor.advice
      });
    }
  };
  var HashMap = class {
    _hash;
    _valueMap = /* @__PURE__ */ new Map();
    _keyMap = /* @__PURE__ */ new Map();
    constructor(_hash) {
      this._hash = _hash;
    }
    get(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.get(hashCode);
    }
    getOrDefault(key, defaultFactory) {
      const hash = this._hash(key);
      if (this._valueMap.has(hash)) {
        return this._valueMap.get(hash);
      }
      const val = defaultFactory();
      if (!this._keyMap.has(hash)) {
        this._keyMap.set(hash, key);
      }
      this._valueMap.set(hash, val);
      return val;
    }
    set(key, value, hashCode) {
      hashCode ??= this._hash(key);
      if (!this._keyMap.has(hashCode)) {
        this._keyMap.set(hashCode, key);
      }
      this._valueMap.set(hashCode, value);
    }
    has(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.has(hashCode);
    }
    *keys() {
      const keyIterator = this._keyMap.entries();
      let next = keyIterator.next();
      while (next.done !== true) {
        yield [next.value[1], next.value[0]];
        next = keyIterator.next();
      }
    }
    *entries() {
      const valueIterator = this._valueMap.entries();
      let next = valueIterator.next();
      while (next.done !== true) {
        yield [this._keyMap.get(next.value[0]), next.value[1], next.value[0]];
        next = valueIterator.next();
      }
    }
    get size() {
      return this._valueMap.size;
    }
  };
  var AttributeHashMap = class extends HashMap {
    constructor() {
      super(hashAttributes);
    }
  };
  var DeltaMetricProcessor = class {
    _aggregator;
    _activeCollectionStorage = new AttributeHashMap();
    // TODO: find a reasonable mean to clean the memo;
    // https://github.com/open-telemetry/opentelemetry-specification/pull/2208
    _cumulativeMemoStorage = new AttributeHashMap();
    _cardinalityLimit;
    _overflowAttributes = {
      "otel.metric.overflow": true
    };
    _overflowHashCode;
    constructor(_aggregator, aggregationCardinalityLimit) {
      this._aggregator = _aggregator;
      this._cardinalityLimit = (aggregationCardinalityLimit ?? 2e3) - 1;
      this._overflowHashCode = hashAttributes(this._overflowAttributes);
    }
    record(value, attributes, _context, collectionTime) {
      let accumulation = this._activeCollectionStorage.get(attributes);
      if (!accumulation) {
        if (this._activeCollectionStorage.size >= this._cardinalityLimit) {
          const overflowAccumulation = this._activeCollectionStorage.getOrDefault(this._overflowAttributes, () => this._aggregator.createAccumulation(collectionTime));
          overflowAccumulation?.record(value);
          return;
        }
        accumulation = this._aggregator.createAccumulation(collectionTime);
        this._activeCollectionStorage.set(attributes, accumulation);
      }
      accumulation?.record(value);
    }
    batchCumulate(measurements, collectionTime) {
      Array.from(measurements.entries()).forEach(([attributes, value, hashCode]) => {
        const accumulation = this._aggregator.createAccumulation(collectionTime);
        accumulation?.record(value);
        let delta = accumulation;
        if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
          const previous = this._cumulativeMemoStorage.get(attributes, hashCode);
          delta = this._aggregator.diff(previous, accumulation);
        } else {
          if (this._cumulativeMemoStorage.size >= this._cardinalityLimit) {
            attributes = this._overflowAttributes;
            hashCode = this._overflowHashCode;
            if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
              const previous = this._cumulativeMemoStorage.get(attributes, hashCode);
              delta = this._aggregator.diff(previous, accumulation);
            }
          }
        }
        if (this._activeCollectionStorage.has(attributes, hashCode)) {
          const active = this._activeCollectionStorage.get(attributes, hashCode);
          delta = this._aggregator.merge(active, delta);
        }
        this._cumulativeMemoStorage.set(attributes, accumulation, hashCode);
        this._activeCollectionStorage.set(attributes, delta, hashCode);
      });
    }
    /**
     * Returns a collection of delta metrics. Start time is the when first
     * time event collected.
     */
    collect() {
      const unreportedDelta = this._activeCollectionStorage;
      this._activeCollectionStorage = new AttributeHashMap();
      return unreportedDelta;
    }
  };
  var TemporalMetricProcessor = class _TemporalMetricProcessor {
    _aggregator;
    _unreportedAccumulations = /* @__PURE__ */ new Map();
    _reportHistory = /* @__PURE__ */ new Map();
    constructor(_aggregator, collectorHandles) {
      this._aggregator = _aggregator;
      collectorHandles.forEach((handle) => {
        this._unreportedAccumulations.set(handle, []);
      });
    }
    /**
     * Builds the {@link MetricData} streams to report against a specific MetricCollector.
     * @param collector The information of the MetricCollector.
     * @param collectors The registered collectors.
     * @param instrumentDescriptor The instrumentation descriptor that these metrics generated with.
     * @param currentAccumulations The current accumulation of metric data from instruments.
     * @param collectionTime The current collection timestamp.
     * @returns The {@link MetricData} points or `null`.
     */
    buildMetrics(collector, instrumentDescriptor, currentAccumulations, collectionTime) {
      this._stashAccumulations(currentAccumulations);
      const unreportedAccumulations = this._getMergedUnreportedAccumulations(collector);
      let result = unreportedAccumulations;
      let aggregationTemporality;
      if (this._reportHistory.has(collector)) {
        const last = this._reportHistory.get(collector);
        const lastCollectionTime = last.collectionTime;
        aggregationTemporality = last.aggregationTemporality;
        if (aggregationTemporality === AggregationTemporality2.CUMULATIVE) {
          result = _TemporalMetricProcessor.merge(last.accumulations, unreportedAccumulations, this._aggregator);
        } else {
          result = _TemporalMetricProcessor.calibrateStartTime(last.accumulations, unreportedAccumulations, lastCollectionTime);
        }
      } else {
        aggregationTemporality = collector.selectAggregationTemporality(instrumentDescriptor.type);
      }
      this._reportHistory.set(collector, {
        accumulations: result,
        collectionTime,
        aggregationTemporality
      });
      const accumulationRecords = AttributesMapToAccumulationRecords(result);
      if (accumulationRecords.length === 0) {
        return void 0;
      }
      return this._aggregator.toMetricData(
        instrumentDescriptor,
        aggregationTemporality,
        accumulationRecords,
        /* endTime */
        collectionTime
      );
    }
    _stashAccumulations(currentAccumulation) {
      const registeredCollectors = this._unreportedAccumulations.keys();
      for (const collector of registeredCollectors) {
        let stash = this._unreportedAccumulations.get(collector);
        if (stash === void 0) {
          stash = [];
          this._unreportedAccumulations.set(collector, stash);
        }
        stash.push(currentAccumulation);
      }
    }
    _getMergedUnreportedAccumulations(collector) {
      let result = new AttributeHashMap();
      const unreportedList = this._unreportedAccumulations.get(collector);
      this._unreportedAccumulations.set(collector, []);
      if (unreportedList === void 0) {
        return result;
      }
      for (const it of unreportedList) {
        result = _TemporalMetricProcessor.merge(result, it, this._aggregator);
      }
      return result;
    }
    static merge(last, current, aggregator) {
      const result = last;
      const iterator = current.entries();
      let next = iterator.next();
      while (next.done !== true) {
        const [key, record, hash] = next.value;
        if (last.has(key, hash)) {
          const lastAccumulation = last.get(key, hash);
          const accumulation = aggregator.merge(lastAccumulation, record);
          result.set(key, accumulation, hash);
        } else {
          result.set(key, record, hash);
        }
        next = iterator.next();
      }
      return result;
    }
    /**
     * Calibrate the reported metric streams' startTime to lastCollectionTime. Leaves
     * the new stream to be the initial observation time unchanged.
     */
    static calibrateStartTime(last, current, lastCollectionTime) {
      for (const [key, hash] of last.keys()) {
        const currentAccumulation = current.get(key, hash);
        currentAccumulation?.setStartTime(lastCollectionTime);
      }
      return current;
    }
  };
  function AttributesMapToAccumulationRecords(map) {
    return Array.from(map.entries());
  }
  var AsyncMetricStorage = class extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(_instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
      super(_instrumentDescriptor);
      this._attributesProcessor = _attributesProcessor;
      this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
      this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
      this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(measurements, observationTime) {
      const processed = new AttributeHashMap();
      Array.from(measurements.entries()).forEach(([attributes, value]) => {
        processed.set(this._attributesProcessor.process(attributes), value);
      });
      this._deltaMetricStorage.batchCumulate(processed, observationTime);
    }
    /**
     * Collects the metrics from this storage. The ObservableCallback is invoked
     * during the collection.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
      const accumulations = this._deltaMetricStorage.collect();
      return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
  };
  function getIncompatibilityDetails(existing, otherDescriptor) {
    let incompatibility = "";
    if (existing.unit !== otherDescriptor.unit) {
      incompatibility += `	- Unit '${existing.unit}' does not match '${otherDescriptor.unit}'
`;
    }
    if (existing.type !== otherDescriptor.type) {
      incompatibility += `	- Type '${existing.type}' does not match '${otherDescriptor.type}'
`;
    }
    if (existing.valueType !== otherDescriptor.valueType) {
      incompatibility += `	- Value Type '${existing.valueType}' does not match '${otherDescriptor.valueType}'
`;
    }
    if (existing.description !== otherDescriptor.description) {
      incompatibility += `	- Description '${existing.description}' does not match '${otherDescriptor.description}'
`;
    }
    return incompatibility;
  }
  function getValueTypeConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use valueType '${existing.valueType}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  function getUnitConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use unit '${existing.unit}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  function getTypeConflictResolutionRecipe(existing, otherDescriptor) {
    const selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit
    };
    const selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'`;
  }
  function getDescriptionResolutionRecipe(existing, otherDescriptor) {
    const selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit
    };
    const selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'
    	- OR - create a new view with the name ${existing.name} and description '${existing.description}' and InstrumentSelector ${selectorString}
    	- OR - create a new view with the name ${otherDescriptor.name} and description '${existing.description}' and InstrumentSelector ${selectorString}`;
  }
  function getConflictResolutionRecipe(existing, otherDescriptor) {
    if (existing.valueType !== otherDescriptor.valueType) {
      return getValueTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.unit !== otherDescriptor.unit) {
      return getUnitConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.type !== otherDescriptor.type) {
      return getTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.description !== otherDescriptor.description) {
      return getDescriptionResolutionRecipe(existing, otherDescriptor);
    }
    return "";
  }
  var MetricStorageRegistry = class _MetricStorageRegistry {
    _sharedRegistry = /* @__PURE__ */ new Map();
    _perCollectorRegistry = /* @__PURE__ */ new Map();
    static create() {
      return new _MetricStorageRegistry();
    }
    getStorages(collector) {
      let storages = [];
      for (const metricStorages of this._sharedRegistry.values()) {
        storages = storages.concat(metricStorages);
      }
      const perCollectorStorages = this._perCollectorRegistry.get(collector);
      if (perCollectorStorages != null) {
        for (const metricStorages of perCollectorStorages.values()) {
          storages = storages.concat(metricStorages);
        }
      }
      return storages;
    }
    register(storage) {
      this._registerStorage(storage, this._sharedRegistry);
    }
    registerForCollector(collector, storage) {
      let storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap == null) {
        storageMap = /* @__PURE__ */ new Map();
        this._perCollectorRegistry.set(collector, storageMap);
      }
      this._registerStorage(storage, storageMap);
    }
    findOrUpdateCompatibleStorage(expectedDescriptor) {
      const storages = this._sharedRegistry.get(expectedDescriptor.name);
      if (storages === void 0) {
        return null;
      }
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    findOrUpdateCompatibleCollectorStorage(collector, expectedDescriptor) {
      const storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap === void 0) {
        return null;
      }
      const storages = storageMap.get(expectedDescriptor.name);
      if (storages === void 0) {
        return null;
      }
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    _registerStorage(storage, storageMap) {
      const descriptor = storage.getInstrumentDescriptor();
      const storages = storageMap.get(descriptor.name);
      if (storages === void 0) {
        storageMap.set(descriptor.name, [storage]);
        return;
      }
      storages.push(storage);
    }
    _findOrUpdateCompatibleStorage(expectedDescriptor, existingStorages) {
      let compatibleStorage = null;
      for (const existingStorage of existingStorages) {
        const existingDescriptor = existingStorage.getInstrumentDescriptor();
        if (isDescriptorCompatibleWith(existingDescriptor, expectedDescriptor)) {
          if (existingDescriptor.description !== expectedDescriptor.description) {
            if (expectedDescriptor.description.length > existingDescriptor.description.length) {
              existingStorage.updateDescription(expectedDescriptor.description);
            }
            diag2.warn("A view or instrument with the name ", expectedDescriptor.name, " has already been registered, but has a different description and is incompatible with another registered view.\n", "Details:\n", getIncompatibilityDetails(existingDescriptor, expectedDescriptor), "The longer description will be used.\nTo resolve the conflict:", getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
          }
          compatibleStorage = existingStorage;
        } else {
          diag2.warn("A view or instrument with the name ", expectedDescriptor.name, " has already been registered and is incompatible with another registered view.\n", "Details:\n", getIncompatibilityDetails(existingDescriptor, expectedDescriptor), "To resolve the conflict:\n", getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
        }
      }
      return compatibleStorage;
    }
  };
  var MultiMetricStorage = class {
    _backingStorages;
    constructor(_backingStorages) {
      this._backingStorages = _backingStorages;
    }
    record(value, attributes, context2, recordTime) {
      this._backingStorages.forEach((it) => {
        it.record(value, attributes, context2, recordTime);
      });
    }
  };
  var ObservableResultImpl = class {
    _instrumentName;
    _valueType;
    /**
     * @internal
     */
    _buffer = new AttributeHashMap();
    constructor(_instrumentName, _valueType) {
      this._instrumentName = _instrumentName;
      this._valueType = _valueType;
    }
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value, attributes = {}) {
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${this._instrumentName}: ${value}`);
        return;
      }
      if (this._valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      this._buffer.set(attributes, value);
    }
  };
  var BatchObservableResultImpl = class {
    /**
     * @internal
     */
    _buffer = /* @__PURE__ */ new Map();
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(metric, value, attributes = {}) {
      if (!isObservableInstrument(metric)) {
        return;
      }
      let map = this._buffer.get(metric);
      if (map == null) {
        map = new AttributeHashMap();
        this._buffer.set(metric, map);
      }
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${metric._descriptor.name}: ${value}`);
        return;
      }
      if (metric._descriptor.valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${metric._descriptor.name}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      map.set(attributes, value);
    }
  };
  var ObservableRegistry = class {
    _callbacks = [];
    _batchCallbacks = [];
    addCallback(callback, instrument) {
      const idx = this._findCallback(callback, instrument);
      if (idx >= 0) {
        return;
      }
      this._callbacks.push({
        callback,
        instrument
      });
    }
    removeCallback(callback, instrument) {
      const idx = this._findCallback(callback, instrument);
      if (idx < 0) {
        return;
      }
      this._callbacks.splice(idx, 1);
    }
    addBatchCallback(callback, instruments) {
      const observableInstruments = new Set(instruments.filter(isObservableInstrument));
      if (observableInstruments.size === 0) {
        diag2.error("BatchObservableCallback is not associated with valid instruments", instruments);
        return;
      }
      const idx = this._findBatchCallback(callback, observableInstruments);
      if (idx >= 0) {
        return;
      }
      this._batchCallbacks.push({
        callback,
        instruments: observableInstruments
      });
    }
    removeBatchCallback(callback, instruments) {
      const observableInstruments = new Set(instruments.filter(isObservableInstrument));
      const idx = this._findBatchCallback(callback, observableInstruments);
      if (idx < 0) {
        return;
      }
      this._batchCallbacks.splice(idx, 1);
    }
    /**
     * @returns a promise of rejected reasons for invoking callbacks.
     */
    async observe(collectionTime, timeoutMillis) {
      const callbackFutures = this._observeCallbacks(collectionTime, timeoutMillis);
      const batchCallbackFutures = this._observeBatchCallbacks(collectionTime, timeoutMillis);
      const results = await PromiseAllSettled([...callbackFutures, ...batchCallbackFutures]);
      const rejections = results.filter(isPromiseAllSettledRejectionResult).map((it) => it.reason);
      return rejections;
    }
    _observeCallbacks(observationTime, timeoutMillis) {
      return this._callbacks.map(async ({
        callback,
        instrument
      }) => {
        const observableResult = new ObservableResultImpl(instrument._descriptor.name, instrument._descriptor.valueType);
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) {
          callPromise = callWithTimeout2(callPromise, timeoutMillis);
        }
        await callPromise;
        instrument._metricStorages.forEach((metricStorage) => {
          metricStorage.record(observableResult._buffer, observationTime);
        });
      });
    }
    _observeBatchCallbacks(observationTime, timeoutMillis) {
      return this._batchCallbacks.map(async ({
        callback,
        instruments
      }) => {
        const observableResult = new BatchObservableResultImpl();
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) {
          callPromise = callWithTimeout2(callPromise, timeoutMillis);
        }
        await callPromise;
        instruments.forEach((instrument) => {
          const buffer = observableResult._buffer.get(instrument);
          if (buffer == null) {
            return;
          }
          instrument._metricStorages.forEach((metricStorage) => {
            metricStorage.record(buffer, observationTime);
          });
        });
      });
    }
    _findCallback(callback, instrument) {
      return this._callbacks.findIndex((record) => {
        return record.callback === callback && record.instrument === instrument;
      });
    }
    _findBatchCallback(callback, instruments) {
      return this._batchCallbacks.findIndex((record) => {
        return record.callback === callback && setEquals(record.instruments, instruments);
      });
    }
  };
  var SyncMetricStorage = class extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
      super(instrumentDescriptor);
      this._attributesProcessor = _attributesProcessor;
      this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
      this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
      this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(value, attributes, context2, recordTime) {
      attributes = this._attributesProcessor.process(attributes, context2);
      this._deltaMetricStorage.record(value, attributes, context2, recordTime);
    }
    /**
     * Collects the metrics from this storage.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
      const accumulations = this._deltaMetricStorage.collect();
      return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
  };
  var NoopAttributesProcessor = class {
    process(incoming, _context) {
      return incoming;
    }
  };
  var MultiAttributesProcessor = class {
    _processors;
    constructor(_processors) {
      this._processors = _processors;
    }
    process(incoming, context2) {
      let filteredAttributes = incoming;
      for (const processor of this._processors) {
        filteredAttributes = processor.process(filteredAttributes, context2);
      }
      return filteredAttributes;
    }
  };
  function createNoopAttributesProcessor() {
    return NOOP;
  }
  function createMultiAttributesProcessor(processors) {
    return new MultiAttributesProcessor(processors);
  }
  var NOOP = new NoopAttributesProcessor();
  var MeterSharedState = class {
    _meterProviderSharedState;
    _instrumentationScope;
    metricStorageRegistry = new MetricStorageRegistry();
    observableRegistry = new ObservableRegistry();
    meter;
    constructor(_meterProviderSharedState, _instrumentationScope) {
      this._meterProviderSharedState = _meterProviderSharedState;
      this._instrumentationScope = _instrumentationScope;
      this.meter = new Meter(this);
    }
    registerMetricStorage(descriptor) {
      const storages = this._registerMetricStorage(descriptor, SyncMetricStorage);
      if (storages.length === 1) {
        return storages[0];
      }
      return new MultiMetricStorage(storages);
    }
    registerAsyncMetricStorage(descriptor) {
      const storages = this._registerMetricStorage(descriptor, AsyncMetricStorage);
      return storages;
    }
    /**
     * @param collector opaque handle of {@link MetricCollector} which initiated the collection.
     * @param collectionTime the HrTime at which the collection was initiated.
     * @param options options for collection.
     * @returns the list of metric data collected.
     */
    async collect(collector, collectionTime, options) {
      const errors = await this.observableRegistry.observe(collectionTime, options?.timeoutMillis);
      const storages = this.metricStorageRegistry.getStorages(collector);
      if (storages.length === 0) {
        return null;
      }
      const metricDataList = storages.map((metricStorage) => {
        return metricStorage.collect(collector, collectionTime);
      }).filter(isNotNullish);
      if (metricDataList.length === 0) {
        return {
          errors
        };
      }
      return {
        scopeMetrics: {
          scope: this._instrumentationScope,
          metrics: metricDataList
        },
        errors
      };
    }
    _registerMetricStorage(descriptor, MetricStorageType) {
      const views = this._meterProviderSharedState.viewRegistry.findViews(descriptor, this._instrumentationScope);
      let storages = views.map((view) => {
        const viewDescriptor = createInstrumentDescriptorWithView(view, descriptor);
        const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleStorage(viewDescriptor);
        if (compatibleStorage != null) {
          return compatibleStorage;
        }
        const aggregator = view.aggregation.createAggregator(viewDescriptor);
        const viewStorage = new MetricStorageType(viewDescriptor, aggregator, view.attributesProcessor, this._meterProviderSharedState.metricCollectors, view.aggregationCardinalityLimit);
        this.metricStorageRegistry.register(viewStorage);
        return viewStorage;
      });
      if (storages.length === 0) {
        const perCollectorAggregations = this._meterProviderSharedState.selectAggregations(descriptor.type);
        const collectorStorages = perCollectorAggregations.map(([collector, aggregation]) => {
          const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(collector, descriptor);
          if (compatibleStorage != null) {
            return compatibleStorage;
          }
          const aggregator = aggregation.createAggregator(descriptor);
          const cardinalityLimit = collector.selectCardinalityLimit(descriptor.type);
          const storage = new MetricStorageType(descriptor, aggregator, createNoopAttributesProcessor(), [collector], cardinalityLimit);
          this.metricStorageRegistry.registerForCollector(collector, storage);
          return storage;
        });
        storages = storages.concat(collectorStorages);
      }
      return storages;
    }
  };
  var MeterProviderSharedState = class {
    resource;
    viewRegistry = new ViewRegistry();
    metricCollectors = [];
    meterSharedStates = /* @__PURE__ */ new Map();
    constructor(resource) {
      this.resource = resource;
    }
    getMeterSharedState(instrumentationScope) {
      const id = instrumentationScopeId(instrumentationScope);
      let meterSharedState = this.meterSharedStates.get(id);
      if (meterSharedState == null) {
        meterSharedState = new MeterSharedState(this, instrumentationScope);
        this.meterSharedStates.set(id, meterSharedState);
      }
      return meterSharedState;
    }
    selectAggregations(instrumentType) {
      const result = [];
      for (const collector of this.metricCollectors) {
        result.push([collector, toAggregation(collector.selectAggregation(instrumentType))]);
      }
      return result;
    }
  };
  var MetricCollector = class {
    _sharedState;
    _metricReader;
    constructor(_sharedState, _metricReader) {
      this._sharedState = _sharedState;
      this._metricReader = _metricReader;
    }
    async collect(options) {
      const collectionTime = millisToHrTime(Date.now());
      const scopeMetrics = [];
      const errors = [];
      const meterCollectionPromises = Array.from(this._sharedState.meterSharedStates.values()).map(async (meterSharedState) => {
        const current = await meterSharedState.collect(this, collectionTime, options);
        if (current?.scopeMetrics != null) {
          scopeMetrics.push(current.scopeMetrics);
        }
        if (current?.errors != null) {
          errors.push(...current.errors);
        }
      });
      await Promise.all(meterCollectionPromises);
      return {
        resourceMetrics: {
          resource: this._sharedState.resource,
          scopeMetrics
        },
        errors
      };
    }
    /**
     * Delegates for MetricReader.forceFlush.
     */
    async forceFlush(options) {
      await this._metricReader.forceFlush(options);
    }
    /**
     * Delegates for MetricReader.shutdown.
     */
    async shutdown(options) {
      await this._metricReader.shutdown(options);
    }
    selectAggregationTemporality(instrumentType) {
      return this._metricReader.selectAggregationTemporality(instrumentType);
    }
    selectAggregation(instrumentType) {
      return this._metricReader.selectAggregation(instrumentType);
    }
    /**
     * Select the cardinality limit for the given {@link InstrumentType} for this
     * collector.
     */
    selectCardinalityLimit(instrumentType) {
      return this._metricReader.selectCardinalityLimit?.(instrumentType) ?? 2e3;
    }
  };
  var ESCAPE = /[\^$\\.+?()[\]{}|]/g;
  var PatternPredicate = class _PatternPredicate {
    _matchAll;
    _regexp;
    constructor(pattern) {
      if (pattern === "*") {
        this._matchAll = true;
        this._regexp = /.*/;
      } else {
        this._matchAll = false;
        this._regexp = new RegExp(_PatternPredicate.escapePattern(pattern));
      }
    }
    match(str) {
      if (this._matchAll) {
        return true;
      }
      return this._regexp.test(str);
    }
    static escapePattern(pattern) {
      return `^${pattern.replace(ESCAPE, "\\$&").replace("*", ".*")}$`;
    }
    static hasWildcard(pattern) {
      return pattern.includes("*");
    }
  };
  var ExactPredicate = class {
    _matchAll;
    _pattern;
    constructor(pattern) {
      this._matchAll = pattern === void 0;
      this._pattern = pattern;
    }
    match(str) {
      if (this._matchAll) {
        return true;
      }
      if (str === this._pattern) {
        return true;
      }
      return false;
    }
  };
  var InstrumentSelector = class {
    _nameFilter;
    _type;
    _unitFilter;
    constructor(criteria) {
      this._nameFilter = new PatternPredicate(criteria?.name ?? "*");
      this._type = criteria?.type;
      this._unitFilter = new ExactPredicate(criteria?.unit);
    }
    getType() {
      return this._type;
    }
    getNameFilter() {
      return this._nameFilter;
    }
    getUnitFilter() {
      return this._unitFilter;
    }
  };
  var MeterSelector = class {
    _nameFilter;
    _versionFilter;
    _schemaUrlFilter;
    constructor(criteria) {
      this._nameFilter = new ExactPredicate(criteria?.name);
      this._versionFilter = new ExactPredicate(criteria?.version);
      this._schemaUrlFilter = new ExactPredicate(criteria?.schemaUrl);
    }
    getNameFilter() {
      return this._nameFilter;
    }
    /**
     * TODO: semver filter? no spec yet.
     */
    getVersionFilter() {
      return this._versionFilter;
    }
    getSchemaUrlFilter() {
      return this._schemaUrlFilter;
    }
  };
  function isSelectorNotProvided(options) {
    return options.instrumentName == null && options.instrumentType == null && options.instrumentUnit == null && options.meterName == null && options.meterVersion == null && options.meterSchemaUrl == null;
  }
  function validateViewOptions(viewOptions) {
    if (isSelectorNotProvided(viewOptions)) {
      throw new Error("Cannot create view with no selector arguments supplied");
    }
    if (viewOptions.name != null && (viewOptions?.instrumentName == null || PatternPredicate.hasWildcard(viewOptions.instrumentName))) {
      throw new Error("Views with a specified name must be declared with an instrument selector that selects at most one instrument per meter.");
    }
  }
  var View = class {
    name;
    description;
    aggregation;
    attributesProcessor;
    instrumentSelector;
    meterSelector;
    aggregationCardinalityLimit;
    /**
     * Create a new {@link View} instance.
     *
     * Parameters can be categorized as two types:
     *  Instrument selection criteria: Used to describe the instrument(s) this view will be applied to.
     *  Will be treated as additive (the Instrument has to meet all the provided criteria to be selected).
     *
     *  Metric stream altering: Alter the metric stream of instruments selected by instrument selection criteria.
     *
     * @param viewOptions {@link ViewOptions} for altering the metric stream and instrument selection.
     * @param viewOptions.name
     * Alters the metric stream:
     *  This will be used as the name of the metrics stream.
     *  If not provided, the original Instrument name will be used.
     * @param viewOptions.description
     * Alters the metric stream:
     *  This will be used as the description of the metrics stream.
     *  If not provided, the original Instrument description will be used by default.
     * @param viewOptions.attributesProcessors
     * Alters the metric stream:
     *  If provided, the attributes will be modified as defined by the added processors.
     *  If not provided, all attribute keys will be used by default.
     * @param viewOptions.aggregationCardinalityLimit
     * Alters the metric stream:
     *  Sets a limit on the number of unique attribute combinations (cardinality) that can be aggregated.
     *  If not provided, the default limit of 2000 will be used.
     * @param viewOptions.aggregation
     * Alters the metric stream:
     *  Alters the {@link Aggregation} of the metric stream.
     * @param viewOptions.instrumentName
     * Instrument selection criteria:
     *  Original name of the Instrument(s) with wildcard support.
     * @param viewOptions.instrumentType
     * Instrument selection criteria:
     *  The original type of the Instrument(s).
     * @param viewOptions.instrumentUnit
     * Instrument selection criteria:
     *  The unit of the Instrument(s).
     * @param viewOptions.meterName
     * Instrument selection criteria:
     *  The name of the Meter. No wildcard support, name must match the meter exactly.
     * @param viewOptions.meterVersion
     * Instrument selection criteria:
     *  The version of the Meter. No wildcard support, version must match exactly.
     * @param viewOptions.meterSchemaUrl
     * Instrument selection criteria:
     *  The schema URL of the Meter. No wildcard support, schema URL must match exactly.
     *
     * @example
     * // Create a view that changes the Instrument 'my.instrument' to use to an
     * // ExplicitBucketHistogramAggregation with the boundaries [20, 30, 40]
     * new View({
     *   aggregation: new ExplicitBucketHistogramAggregation([20, 30, 40]),
     *   instrumentName: 'my.instrument'
     * })
     */
    constructor(viewOptions) {
      validateViewOptions(viewOptions);
      if (viewOptions.attributesProcessors != null) {
        this.attributesProcessor = createMultiAttributesProcessor(viewOptions.attributesProcessors);
      } else {
        this.attributesProcessor = createNoopAttributesProcessor();
      }
      this.name = viewOptions.name;
      this.description = viewOptions.description;
      this.aggregation = toAggregation(viewOptions.aggregation ?? {
        type: AggregationType2.DEFAULT
      });
      this.instrumentSelector = new InstrumentSelector({
        name: viewOptions.instrumentName,
        type: viewOptions.instrumentType,
        unit: viewOptions.instrumentUnit
      });
      this.meterSelector = new MeterSelector({
        name: viewOptions.meterName,
        version: viewOptions.meterVersion,
        schemaUrl: viewOptions.meterSchemaUrl
      });
      this.aggregationCardinalityLimit = viewOptions.aggregationCardinalityLimit;
    }
  };
  var MeterProvider = class {
    _sharedState;
    _shutdown = false;
    constructor(options) {
      this._sharedState = new MeterProviderSharedState(options?.resource ?? defaultResource());
      if (options?.views != null && options.views.length > 0) {
        for (const viewOption of options.views) {
          this._sharedState.viewRegistry.addView(new View(viewOption));
        }
      }
      if (options?.readers != null && options.readers.length > 0) {
        for (const metricReader of options.readers) {
          const collector = new MetricCollector(this._sharedState, metricReader);
          metricReader.setMetricProducer(collector);
          this._sharedState.metricCollectors.push(collector);
        }
      }
    }
    /**
     * Get a meter with the configuration of the MeterProvider.
     */
    getMeter(name, version = "", options = {}) {
      if (this._shutdown) {
        diag2.warn("A shutdown MeterProvider cannot provide a Meter");
        return createNoopMeter();
      }
      return this._sharedState.getMeterSharedState({
        name,
        version,
        schemaUrl: options.schemaUrl
      }).meter;
    }
    /**
     * Shut down the MeterProvider and all registered
     * MetricReaders.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async shutdown(options) {
      if (this._shutdown) {
        diag2.warn("shutdown may only be called once per MeterProvider");
        return;
      }
      this._shutdown = true;
      await Promise.all(this._sharedState.metricCollectors.map((collector) => {
        return collector.shutdown(options);
      }));
    }
    /**
     * Notifies all registered MetricReaders to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async forceFlush(options) {
      if (this._shutdown) {
        diag2.warn("invalid attempt to force flush after MeterProvider shutdown");
        return;
      }
      await Promise.all(this._sharedState.metricCollectors.map((collector) => {
        return collector.forceFlush(options);
      }));
    }
  };
  var NoopLogger2 = class {
    emit(_logRecord) {
    }
  };
  var NOOP_LOGGER2 = new NoopLogger2();
  var NoopLoggerProvider2 = class {
    getLogger(_name, _version, _options) {
      return new NoopLogger2();
    }
  };
  var NOOP_LOGGER_PROVIDER2 = new NoopLoggerProvider2();
  var ProxyLogger2 = class {
    constructor(_provider, name, version, options) {
      this._provider = _provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    /**
     * Emit a log record. This method should only be used by log appenders.
     *
     * @param logRecord
     */
    emit(logRecord) {
      this._getLogger().emit(logRecord);
    }
    /**
     * Try to get a logger from the proxy logger provider.
     * If the proxy logger provider has no delegate, return a noop logger.
     */
    _getLogger() {
      if (this._delegate) {
        return this._delegate;
      }
      const logger3 = this._provider.getDelegateLogger(this.name, this.version, this.options);
      if (!logger3) {
        return NOOP_LOGGER2;
      }
      this._delegate = logger3;
      return this._delegate;
    }
  };
  var ProxyLoggerProvider2 = class {
    getLogger(name, version, options) {
      var _a;
      return (_a = this.getDelegateLogger(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger2(this, name, version, options);
    }
    getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_LOGGER_PROVIDER2;
    }
    /**
     * Set the delegate logger provider
     */
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateLogger(name, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name, version, options);
    }
  };
  var _globalThis5 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
  var GLOBAL_LOGS_API_KEY2 = Symbol.for("io.opentelemetry.js.api.logs");
  var _global3 = _globalThis5;
  function makeGetter2(requiredVersion, instance, fallback) {
    return (version) => version === requiredVersion ? instance : fallback;
  }
  var API_BACKWARDS_COMPATIBILITY_VERSION2 = 1;
  var LogsAPI2 = class _LogsAPI {
    constructor() {
      this._proxyLoggerProvider = new ProxyLoggerProvider2();
    }
    static getInstance() {
      if (!this._instance) {
        this._instance = new _LogsAPI();
      }
      return this._instance;
    }
    setGlobalLoggerProvider(provider) {
      if (_global3[GLOBAL_LOGS_API_KEY2]) {
        return this.getLoggerProvider();
      }
      _global3[GLOBAL_LOGS_API_KEY2] = makeGetter2(API_BACKWARDS_COMPATIBILITY_VERSION2, provider, NOOP_LOGGER_PROVIDER2);
      this._proxyLoggerProvider.setDelegate(provider);
      return provider;
    }
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    getLoggerProvider() {
      var _a, _b;
      return (_b = (_a = _global3[GLOBAL_LOGS_API_KEY2]) === null || _a === void 0 ? void 0 : _a.call(_global3, API_BACKWARDS_COMPATIBILITY_VERSION2)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
    }
    /**
     * Returns a logger from the global logger provider.
     *
     * @returns Logger
     */
    getLogger(name, version, options) {
      return this.getLoggerProvider().getLogger(name, version, options);
    }
    /** Remove the global logger provider */
    disable() {
      delete _global3[GLOBAL_LOGS_API_KEY2];
      this._proxyLoggerProvider = new ProxyLoggerProvider2();
    }
  };
  var logs2 = LogsAPI2.getInstance();
  var LogRecordImpl = class {
    hrTime;
    hrTimeObserved;
    spanContext;
    resource;
    instrumentationScope;
    attributes = {};
    _severityText;
    _severityNumber;
    _body;
    _eventName;
    totalAttributesCount = 0;
    _isReadonly = false;
    _logRecordLimits;
    set severityText(severityText) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._severityText = severityText;
    }
    get severityText() {
      return this._severityText;
    }
    set severityNumber(severityNumber) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._severityNumber = severityNumber;
    }
    get severityNumber() {
      return this._severityNumber;
    }
    set body(body) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._body = body;
    }
    get body() {
      return this._body;
    }
    get eventName() {
      return this._eventName;
    }
    set eventName(eventName) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._eventName = eventName;
    }
    get droppedAttributesCount() {
      return this.totalAttributesCount - Object.keys(this.attributes).length;
    }
    constructor(_sharedState, instrumentationScope, logRecord) {
      const {
        timestamp,
        observedTimestamp,
        eventName,
        severityNumber,
        severityText,
        body,
        attributes = {},
        context: context2
      } = logRecord;
      const now = Date.now();
      this.hrTime = timeInputToHrTime(timestamp ?? now);
      this.hrTimeObserved = timeInputToHrTime(observedTimestamp ?? now);
      if (context2) {
        const spanContext = trace.getSpanContext(context2);
        if (spanContext && isSpanContextValid(spanContext)) {
          this.spanContext = spanContext;
        }
      }
      this.severityNumber = severityNumber;
      this.severityText = severityText;
      this.body = body;
      this.resource = _sharedState.resource;
      this.instrumentationScope = instrumentationScope;
      this._logRecordLimits = _sharedState.logRecordLimits;
      this._eventName = eventName;
      this.setAttributes(attributes);
    }
    setAttribute(key, value) {
      if (this._isLogRecordReadonly()) {
        return this;
      }
      if (value === null) {
        return this;
      }
      if (key.length === 0) {
        diag2.warn(`Invalid attribute key: ${key}`);
        return this;
      }
      if (!isAttributeValue(value) && !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        return this;
      }
      this.totalAttributesCount += 1;
      if (Object.keys(this.attributes).length >= this._logRecordLimits.attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
        if (this.droppedAttributesCount === 1) {
          diag2.warn("Dropping extra attributes.");
        }
        return this;
      }
      if (isAttributeValue(value)) {
        this.attributes[key] = this._truncateToSize(value);
      } else {
        this.attributes[key] = value;
      }
      return this;
    }
    setAttributes(attributes) {
      for (const [k2, v2] of Object.entries(attributes)) {
        this.setAttribute(k2, v2);
      }
      return this;
    }
    setBody(body) {
      this.body = body;
      return this;
    }
    setEventName(eventName) {
      this.eventName = eventName;
      return this;
    }
    setSeverityNumber(severityNumber) {
      this.severityNumber = severityNumber;
      return this;
    }
    setSeverityText(severityText) {
      this.severityText = severityText;
      return this;
    }
    /**
     * @internal
     * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
     * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
     */
    _makeReadonly() {
      this._isReadonly = true;
    }
    _truncateToSize(value) {
      const limit = this._logRecordLimits.attributeValueLengthLimit;
      if (limit <= 0) {
        diag2.warn(`Attribute value limit must be positive, got ${limit}`);
        return value;
      }
      if (typeof value === "string") {
        return this._truncateToLimitUtil(value, limit);
      }
      if (Array.isArray(value)) {
        return value.map((val) => typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val);
      }
      return value;
    }
    _truncateToLimitUtil(value, limit) {
      if (value.length <= limit) {
        return value;
      }
      return value.substring(0, limit);
    }
    _isLogRecordReadonly() {
      if (this._isReadonly) {
        diag2.warn("Can not execute the operation on emitted log record");
      }
      return this._isReadonly;
    }
  };
  var Logger = class {
    instrumentationScope;
    _sharedState;
    constructor(instrumentationScope, _sharedState) {
      this.instrumentationScope = instrumentationScope;
      this._sharedState = _sharedState;
    }
    emit(logRecord) {
      const currentContext = logRecord.context || context.active();
      const logRecordInstance = new LogRecordImpl(this._sharedState, this.instrumentationScope, {
        context: currentContext,
        ...logRecord
      });
      this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
      logRecordInstance._makeReadonly();
    }
  };
  function loadDefaultConfig2() {
    return {
      forceFlushTimeoutMillis: 3e4,
      logRecordLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ?? 128
      },
      includeTraceContext: true
    };
  }
  function reconfigureLimits2(logRecordLimits) {
    return {
      /**
       * Reassign log record attribute count limit to use first non null value defined by user or use default value
       */
      attributeCountLimit: logRecordLimits.attributeCountLimit ?? getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128,
      /**
       * Reassign log record attribute value length limit to use first non null value defined by user or use default value
       */
      attributeValueLengthLimit: logRecordLimits.attributeValueLengthLimit ?? getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity
    };
  }
  var NoopLogRecordProcessor = class {
    forceFlush() {
      return Promise.resolve();
    }
    onEmit(_logRecord, _context) {
    }
    shutdown() {
      return Promise.resolve();
    }
  };
  var MultiLogRecordProcessor = class {
    processors;
    forceFlushTimeoutMillis;
    constructor(processors, forceFlushTimeoutMillis) {
      this.processors = processors;
      this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
    }
    async forceFlush() {
      const timeout = this.forceFlushTimeoutMillis;
      await Promise.all(this.processors.map((processor) => callWithTimeout(processor.forceFlush(), timeout)));
    }
    onEmit(logRecord, context2) {
      this.processors.forEach((processors) => processors.onEmit(logRecord, context2));
    }
    async shutdown() {
      await Promise.all(this.processors.map((processor) => processor.shutdown()));
    }
  };
  var LoggerProviderSharedState = class {
    resource;
    forceFlushTimeoutMillis;
    logRecordLimits;
    processors;
    loggers = /* @__PURE__ */ new Map();
    activeProcessor;
    registeredLogRecordProcessors = [];
    constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors) {
      this.resource = resource;
      this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
      this.logRecordLimits = logRecordLimits;
      this.processors = processors;
      if (processors.length > 0) {
        this.registeredLogRecordProcessors = processors;
        this.activeProcessor = new MultiLogRecordProcessor(this.registeredLogRecordProcessors, this.forceFlushTimeoutMillis);
      } else {
        this.activeProcessor = new NoopLogRecordProcessor();
      }
    }
  };
  var DEFAULT_LOGGER_NAME = "unknown";
  var LoggerProvider = class {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
      const mergedConfig = merge({}, loadDefaultConfig2(), config);
      const resource = config.resource ?? defaultResource();
      this._sharedState = new LoggerProviderSharedState(resource, mergedConfig.forceFlushTimeoutMillis, reconfigureLimits2(mergedConfig.logRecordLimits), config?.processors ?? []);
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("A shutdown LoggerProvider cannot provide a Logger");
        return NOOP_LOGGER2;
      }
      if (!name) {
        diag2.warn("Logger requested without instrumentation scope name.");
      }
      const loggerName = name || DEFAULT_LOGGER_NAME;
      const key = `${loggerName}@${version || ""}:${options?.schemaUrl || ""}`;
      if (!this._sharedState.loggers.has(key)) {
        this._sharedState.loggers.set(key, new Logger({
          name: loggerName,
          version,
          schemaUrl: options?.schemaUrl
        }, this._sharedState));
      }
      return this._sharedState.loggers.get(key);
    }
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush() {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("invalid attempt to force flush after LoggerProvider shutdown");
        return this._shutdownOnce.promise;
      }
      return this._sharedState.activeProcessor.forceFlush();
    }
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown() {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("shutdown may only be called once per LoggerProvider");
        return this._shutdownOnce.promise;
      }
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return this._sharedState.activeProcessor.shutdown();
    }
  };
  var ConsoleLogRecordExporter = class {
    /**
     * Export logs.
     * @param logs
     * @param resultCallback
     */
    export(logs4, resultCallback) {
      this._sendLogRecords(logs4, resultCallback);
    }
    /**
     * Shutdown the exporter.
     */
    shutdown() {
      return Promise.resolve();
    }
    /**
     * converts logRecord info into more readable format
     * @param logRecord
     */
    _exportInfo(logRecord) {
      return {
        resource: {
          attributes: logRecord.resource.attributes
        },
        instrumentationScope: logRecord.instrumentationScope,
        timestamp: hrTimeToMicroseconds(logRecord.hrTime),
        traceId: logRecord.spanContext?.traceId,
        spanId: logRecord.spanContext?.spanId,
        traceFlags: logRecord.spanContext?.traceFlags,
        severityText: logRecord.severityText,
        severityNumber: logRecord.severityNumber,
        body: logRecord.body,
        attributes: logRecord.attributes
      };
    }
    /**
     * Showing logs  in console
     * @param logRecords
     * @param done
     */
    _sendLogRecords(logRecords, done) {
      for (const logRecord of logRecords) {
        console.dir(this._exportInfo(logRecord), {
          depth: 3
        });
      }
      done?.({
        code: ExportResultCode.SUCCESS
      });
    }
  };
  var SimpleLogRecordProcessor = class {
    _exporter;
    _shutdownOnce;
    _unresolvedExports;
    constructor(_exporter) {
      this._exporter = _exporter;
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
      this._unresolvedExports = /* @__PURE__ */ new Set();
    }
    onEmit(logRecord) {
      if (this._shutdownOnce.isCalled) {
        return;
      }
      const doExport = () => internal._export(this._exporter, [logRecord]).then((result) => {
        if (result.code !== ExportResultCode.SUCCESS) {
          globalErrorHandler(result.error ?? new Error(`SimpleLogRecordProcessor: log record export failed (status ${result})`));
        }
      }).catch(globalErrorHandler);
      if (logRecord.resource.asyncAttributesPending) {
        const exportPromise = logRecord.resource.waitForAsyncAttributes?.().then(() => {
          this._unresolvedExports.delete(exportPromise);
          return doExport();
        }, globalErrorHandler);
        if (exportPromise != null) {
          this._unresolvedExports.add(exportPromise);
        }
      } else {
        void doExport();
      }
    }
    async forceFlush() {
      await Promise.all(Array.from(this._unresolvedExports));
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return this._exporter.shutdown();
    }
  };
  var WebSDK = class {
    /**
     * Create a new Web SDK instance
     */
    constructor(configuration = {}) {
      var _a, _b, _c;
      this._resource = defaultResource().merge((_a = configuration.resource) !== null && _a !== void 0 ? _a : resourceFromAttributes({}));
      this._resourceDetectors = (_b = configuration.resourceDetectors) !== null && _b !== void 0 ? _b : [browserDetector];
      this._serviceName = configuration.serviceName;
      this._serviceVersion = configuration.serviceVersion;
      this._autoDetectResources = (_c = configuration.autoDetectResources) !== null && _c !== void 0 ? _c : true;
      if (configuration.spanProcessor || configuration.traceExporter || configuration.spanProcessors) {
        const tracerProviderConfig = {};
        if (configuration.sampler) {
          tracerProviderConfig.sampler = configuration.sampler;
        }
        if (configuration.spanLimits) {
          tracerProviderConfig.spanLimits = configuration.spanLimits;
        }
        if (configuration.idGenerator) {
          tracerProviderConfig.idGenerator = configuration.idGenerator;
        }
        const spanProcessors = configuration.spanProcessors || [];
        if (configuration.traceExporter) {
          spanProcessors.push(new BatchSpanProcessor(configuration.traceExporter));
        }
        this._tracerProviderConfig = {
          tracerConfig: tracerProviderConfig,
          spanProcessor: configuration.spanProcessor,
          spanProcessors,
          contextManager: configuration.contextManager,
          textMapPropagator: configuration.textMapPropagator
        };
      }
      if (configuration.metricExporters) {
        this._meterProviderConfig = {
          metricExporters: configuration.metricExporters
        };
      }
      if (configuration.logExporters) {
        this._loggerProviderConfig = {
          logExporters: configuration.logExporters
        };
      }
      let instrumentations = [];
      if (configuration.instrumentations) {
        instrumentations = configuration.instrumentations;
      }
      this._instrumentations = instrumentations;
    }
    /**
     * Call this method to construct SDK components and register them with the OpenTelemetry API.
     */
    start() {
      var _a, _b, _c, _d, _e;
      if (this._disabled) {
        return;
      }
      registerInstrumentations({
        instrumentations: this._instrumentations
      });
      if (this._autoDetectResources) {
        const internalConfig = {
          detectors: this._resourceDetectors
        };
        this._resource = this._resource.merge(detectResources(internalConfig));
      }
      this._resource = this._serviceName === void 0 ? this._resource : this._resource.merge(resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this._serviceName
      }));
      if (this._serviceVersion !== void 0) {
        this._resource = this._resource.merge(resourceFromAttributes({
          [ATTR_SERVICE_VERSION]: this._serviceVersion
        }));
      }
      const spanProcessors = [];
      if ((_a = this._tracerProviderConfig) === null || _a === void 0 ? void 0 : _a.spanProcessor) {
        spanProcessors.push(this._tracerProviderConfig.spanProcessor);
      }
      if ((_b = this._tracerProviderConfig) === null || _b === void 0 ? void 0 : _b.spanProcessors) {
        spanProcessors.push(...this._tracerProviderConfig.spanProcessors);
      }
      const tracerProvider = new WebTracerProvider(Object.assign(Object.assign({}, (_c = this._tracerProviderConfig) === null || _c === void 0 ? void 0 : _c.tracerConfig), {
        resource: this._resource,
        spanProcessors
      }));
      this._tracerProvider = tracerProvider;
      tracerProvider.register({
        contextManager: (_d = this._tracerProviderConfig) === null || _d === void 0 ? void 0 : _d.contextManager,
        propagator: (_e = this._tracerProviderConfig) === null || _e === void 0 ? void 0 : _e.textMapPropagator
      });
      if (this._meterProviderConfig) {
        const readers = this._meterProviderConfig.metricExporters.map((exporter) => {
          return new PeriodicExportingMetricReader({
            exporter
          });
        });
        this._meterProvider = new MeterProvider({
          resource: this._resource,
          readers
        });
        metrics.setGlobalMeterProvider(this._meterProvider);
      }
      if (this._loggerProviderConfig) {
        const processors = this._loggerProviderConfig.logExporters.map((exporter) => {
          return new SimpleLogRecordProcessor(exporter);
        });
        this._loggerProvider = new LoggerProvider({
          resource: this._resource,
          processors
        });
        logs2.setGlobalLoggerProvider(this._loggerProvider);
      }
    }
    /* Experimental getter method: not currently part of the upstream
     * sdk's API */
    getResourceAttributes() {
      return this._resource.attributes;
    }
    forceFlush() {
      const promises = [];
      if (this._tracerProvider) {
        promises.push(this._tracerProvider.forceFlush());
      }
      if (this._meterProvider) {
        promises.push(this._meterProvider.forceFlush());
      }
      if (this._loggerProvider) {
        promises.push(this._loggerProvider.forceFlush());
      }
      return Promise.all(promises).then(() => {
      });
    }
    shutdown() {
      const promises = [];
      if (this._tracerProvider) {
        promises.push(this._tracerProvider.shutdown());
      }
      if (this._meterProvider) {
        promises.push(this._meterProvider.shutdown());
      }
      if (this._loggerProvider) {
        promises.push(this._loggerProvider.shutdown());
      }
      return Promise.all(promises).then(() => {
      });
    }
  };
  var DEFAULT_API_ENDPOINT = "https://api.honeycomb.io";
  var TRACES_PATH = "v1/traces";
  var DEFAULT_TRACES_ENDPOINT = `${DEFAULT_API_ENDPOINT}/${TRACES_PATH}`;
  var METRICS_PATH = "v1/metrics";
  var DEFAULT_METRICS_ENDPOINT = `${DEFAULT_API_ENDPOINT}/${METRICS_PATH}`;
  var LOGS_PATH = "v1/logs";
  var DEFAULT_LOGS_ENDPOINT = `${DEFAULT_API_ENDPOINT}/${LOGS_PATH}`;
  var DEFAULT_SERVICE_NAME = "unknown_service";
  var DEFAULT_SAMPLE_RATE = 1;
  var defaultOptions = {
    apiKey: "",
    tracesApiKey: "",
    endpoint: DEFAULT_TRACES_ENDPOINT,
    tracesEndpoint: DEFAULT_TRACES_ENDPOINT,
    serviceName: DEFAULT_SERVICE_NAME,
    debug: false,
    sampleRate: 1,
    skipOptionsValidation: false,
    localVisualizations: false,
    webVitalsInstrumentationConfig: {
      enabled: true
    }
  };
  var createHoneycombSDKLogMessage = (message) => `@honeycombio/opentelemetry-web: ${message}`;
  var classicKeyRegex = /^[a-f0-9]*$/;
  var ingestClassicKeyRegex = /^hc[a-z]ic_[a-z0-9]*$/;
  function isClassic(apikey) {
    if (apikey == null || apikey.length === 0) {
      return false;
    } else if (apikey.length === 32) {
      return classicKeyRegex.test(apikey);
    } else if (apikey.length === 64) {
      return ingestClassicKeyRegex.test(apikey);
    }
    return false;
  }
  function maybeAppendPath(url, path) {
    if (url.endsWith(path) || url.endsWith(`${path}/`)) {
      return url;
    }
    return url.endsWith("/") ? url + path : url + "/" + path;
  }
  var getTracesEndpoint = (options) => {
    if (options === null || options === void 0 ? void 0 : options.tracesEndpoint) {
      return options.tracesEndpoint;
    }
    if (options === null || options === void 0 ? void 0 : options.endpoint) {
      return maybeAppendPath(options.endpoint, TRACES_PATH);
    }
    return DEFAULT_TRACES_ENDPOINT;
  };
  var getMetricsEndpoint = (options) => {
    if (options === null || options === void 0 ? void 0 : options.metricsEndpoint) {
      return options.metricsEndpoint;
    }
    if (options === null || options === void 0 ? void 0 : options.endpoint) {
      return maybeAppendPath(options.endpoint, METRICS_PATH);
    }
    return DEFAULT_METRICS_ENDPOINT;
  };
  var getLogsEndpoint = (options) => {
    if (options === null || options === void 0 ? void 0 : options.logsEndpoint) {
      return options.logsEndpoint;
    }
    if (options === null || options === void 0 ? void 0 : options.endpoint) {
      return maybeAppendPath(options.endpoint, LOGS_PATH);
    }
    return DEFAULT_LOGS_ENDPOINT;
  };
  var getTracesApiKey = (options) => {
    return (options === null || options === void 0 ? void 0 : options.tracesApiKey) || (options === null || options === void 0 ? void 0 : options.apiKey);
  };
  var getMetricsApiKey = (options) => {
    return (options === null || options === void 0 ? void 0 : options.metricsApiKey) || (options === null || options === void 0 ? void 0 : options.apiKey);
  };
  var getLogsApiKey = (options) => {
    return (options === null || options === void 0 ? void 0 : options.logsApiKey) || (options === null || options === void 0 ? void 0 : options.apiKey);
  };
  var getSampleRate = (options) => {
    if (
      // must be a whole positive integer
      typeof (options === null || options === void 0 ? void 0 : options.sampleRate) === "number" && Number.isSafeInteger(options === null || options === void 0 ? void 0 : options.sampleRate) && (options === null || options === void 0 ? void 0 : options.sampleRate) >= 0
    ) {
      return options === null || options === void 0 ? void 0 : options.sampleRate;
    }
    return DEFAULT_SAMPLE_RATE;
  };
  var MISSING_API_KEY_ERROR = createHoneycombSDKLogMessage("\u274C Missing API Key. Set `apiKey` in HoneycombOptions. Telemetry will not be exported.");
  var MISSING_SERVICE_NAME_ERROR = createHoneycombSDKLogMessage(`\u274C Missing Service Name. Set \`serviceName\` in HoneycombOptions. Defaulting to '${defaultOptions.serviceName}'`);
  var IGNORED_DATASET_ERROR = createHoneycombSDKLogMessage("\u{1F515} Dataset is ignored in favor of service name.");
  var MISSING_DATASET_ERROR = createHoneycombSDKLogMessage("\u274C Missing dataset. Specify either HONEYCOMB_DATASET environment variable or dataset in the options parameter.");
  var SKIPPING_OPTIONS_VALIDATION_MSG = createHoneycombSDKLogMessage("\u23ED\uFE0F Skipping options validation. To re-enable, set skipOptionsValidation option or HONEYCOMB_SKIP_OPTIONS_VALIDATION to false.");
  var CUSTOM_COLLECTOR_VALIDATION_MSG = createHoneycombSDKLogMessage("\u23ED\uFE0F Skipping options validation, because a custom collector is being used.");
  var SAMPLER_OVERRIDE_WARNING = createHoneycombSDKLogMessage("\u{1F528} Default deterministic sampler has been overridden. Honeycomb requires a resource attribute called SampleRate to properly show weighted values. Non-deterministic sampleRate could lead to missing spans in Honeycomb. See our docs for more details. https://docs.honeycomb.io/getting-data-in/opentelemetry/node-distro/#sampling-without-the-honeycomb-sdk");
  var MISSING_FIELDS_FOR_LOCAL_VISUALIZATIONS = createHoneycombSDKLogMessage("\u{1F515} Disabling local visualizations - must have both service name and API key configured.");
  var MISSING_FIELDS_FOR_GENERATING_LINKS = createHoneycombSDKLogMessage("\u{1F515} Disabling local visualizations - cannot infer auth and ui url roots from endpoint url.");
  var FAILED_AUTH_FOR_LOCAL_VISUALIZATIONS = createHoneycombSDKLogMessage("\u{1F515} Failed to get proper auth response from Honeycomb. No local visualization available.");
  var NO_EXPORTERS_DISABLED_DEFAULT = createHoneycombSDKLogMessage("\u{1F515} Default honeycomb exporter disabled but no exporters provided");
  var isCustomCollector = (endpoint) => {
    try {
      const url = new URL(endpoint);
      return !url.hostname.endsWith(".honeycomb.io");
    } catch (_a) {
      return false;
    }
  };
  var validateOptionsWarnings = (options) => {
    var _a, _b;
    const logLevel = (options === null || options === void 0 ? void 0 : options.logLevel) ? options.logLevel : DiagLogLevel.DEBUG;
    if (options === null || options === void 0 ? void 0 : options.skipOptionsValidation) {
      if (logLevel >= DiagLogLevel.DEBUG) {
        console.debug(SKIPPING_OPTIONS_VALIDATION_MSG);
      }
      return;
    }
    const endpoint = (_a = options === null || options === void 0 ? void 0 : options.tracesEndpoint) !== null && _a !== void 0 ? _a : options === null || options === void 0 ? void 0 : options.endpoint;
    if (endpoint && isCustomCollector(endpoint)) {
      if (logLevel >= DiagLogLevel.DEBUG) {
        console.debug(CUSTOM_COLLECTOR_VALIDATION_MSG);
      }
      return;
    }
    if (!(options === null || options === void 0 ? void 0 : options.apiKey) && logLevel >= DiagLogLevel.WARN) {
      console.warn(MISSING_API_KEY_ERROR);
    }
    if (!(options === null || options === void 0 ? void 0 : options.serviceName) && logLevel >= DiagLogLevel.WARN) {
      console.warn(MISSING_SERVICE_NAME_ERROR);
    }
    if ((options === null || options === void 0 ? void 0 : options.apiKey) && !isClassic(options === null || options === void 0 ? void 0 : options.apiKey) && (options === null || options === void 0 ? void 0 : options.dataset) && logLevel >= DiagLogLevel.WARN) {
      console.warn(IGNORED_DATASET_ERROR);
    }
    if ((options === null || options === void 0 ? void 0 : options.apiKey) && isClassic(options === null || options === void 0 ? void 0 : options.apiKey) && !(options === null || options === void 0 ? void 0 : options.dataset) && logLevel >= DiagLogLevel.WARN) {
      console.warn(MISSING_DATASET_ERROR);
    }
    if ((options === null || options === void 0 ? void 0 : options.sampler) && logLevel >= DiagLogLevel.DEBUG) {
      console.debug(SAMPLER_OVERRIDE_WARNING);
    }
    if ((options === null || options === void 0 ? void 0 : options.disableDefaultTraceExporter) === true && !(options === null || options === void 0 ? void 0 : options.traceExporter) && !((_b = options === null || options === void 0 ? void 0 : options.traceExporters) === null || _b === void 0 ? void 0 : _b.length)) {
      console.warn(NO_EXPORTERS_DISABLED_DEFAULT);
    }
    return options;
  };
  function configureDebug(options) {
    if (!(options === null || options === void 0 ? void 0 : options.debug)) {
      return;
    }
    diag2.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    diag2.debug(createHoneycombSDKLogMessage("\u{1F41D} Honeycomb Web SDK Debug Mode Enabled \u{1F41D}"));
    const tracesEndpoint = getTracesEndpoint(options);
    const currentOptions = Object.assign(Object.assign(Object.assign({}, defaultOptions), options), {
      tracesEndpoint
    });
    debugTracesApiKey(currentOptions);
    debugServiceName(currentOptions);
    debugTracesEndpoint(currentOptions);
    debugSampleRate(currentOptions);
  }
  function debugTracesApiKey(options) {
    const tracesApiKey = getTracesApiKey(options) || "";
    if (!tracesApiKey) {
      diag2.debug(MISSING_API_KEY_ERROR);
      return;
    }
    diag2.debug(createHoneycombSDKLogMessage(`API Key configured for traces: '${tracesApiKey}'`));
  }
  function debugServiceName(options) {
    const serviceName = options.serviceName || defaultOptions.serviceName;
    if (serviceName === defaultOptions.serviceName) {
      diag2.debug(MISSING_SERVICE_NAME_ERROR);
      return;
    }
    diag2.debug(`@honeycombio/opentelemetry-web: Service Name configured for traces: '${serviceName}'`);
  }
  function debugTracesEndpoint(options) {
    const tracesEndpoint = getTracesEndpoint(options);
    if (!tracesEndpoint) {
      diag2.debug(createHoneycombSDKLogMessage("No endpoint configured for traces"));
      return;
    }
    diag2.debug(createHoneycombSDKLogMessage(`Endpoint configured for traces: '${tracesEndpoint}'`));
  }
  function debugSampleRate(options) {
    const sampleRate = getSampleRate(options);
    if (!sampleRate) {
      diag2.debug("No sampler configured for traces");
      return;
    }
    diag2.debug(createHoneycombSDKLogMessage(`Sample Rate configured for traces: '${sampleRate}'`));
  }
  var configureSampler = (options) => {
    if (options === null || options === void 0 ? void 0 : options.sampler) {
      return options.sampler;
    }
    const sampleRate = getSampleRate(options);
    return new DeterministicSampler(sampleRate);
  };
  var DeterministicSampler = class {
    constructor(sampleRate) {
      this._sampleRate = sampleRate;
      switch (sampleRate) {
        // sample rate of 0 means send nothing
        case 0:
          this._sampler = new AlwaysOffSampler();
          break;
        // sample rate of 1 is default, send everything
        case 1:
          this._sampler = new AlwaysOnSampler();
          break;
        default: {
          const ratio = 1 / sampleRate;
          this._sampler = new TraceIdRatioBasedSampler(ratio);
          break;
        }
      }
    }
    shouldSample(context2, traceId, spanName, spanKind, attributes, links) {
      const result = this._sampler.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      return Object.assign(Object.assign({}, result), {
        attributes: Object.assign(Object.assign({}, result.attributes), {
          SampleRate: this._sampleRate
        })
      });
    }
    toString() {
      return `DeterministicSampler(${this._sampler.toString()})`;
    }
  };
  var t = class {
    t;
    o = 0;
    i = [];
    u(t2) {
      if (t2.hadRecentInput) return;
      const e2 = this.i[0], n2 = this.i.at(-1);
      this.o && e2 && n2 && t2.startTime - n2.startTime < 1e3 && t2.startTime - e2.startTime < 5e3 ? (this.o += t2.value, this.i.push(t2)) : (this.o = t2.value, this.i = [t2]), this.t?.(t2);
    }
  };
  var e = () => {
    const t2 = performance.getEntriesByType("navigation")[0];
    if (t2 && t2.responseStart > 0 && t2.responseStart < performance.now()) return t2;
  };
  var n = (t2) => {
    if ("loading" === document.readyState) return "loading";
    {
      const n2 = e();
      if (n2) {
        if (t2 < n2.domInteractive) return "loading";
        if (0 === n2.domContentLoadedEventStart || t2 < n2.domContentLoadedEventStart) return "dom-interactive";
        if (0 === n2.domComplete || t2 < n2.domComplete) return "dom-content-loaded";
      }
    }
    return "complete";
  };
  var o = (t2) => {
    const e2 = t2.nodeName;
    return 1 === t2.nodeType ? e2.toLowerCase() : e2.toUpperCase().replace(/^#/, "");
  };
  var i = (t2) => {
    let e2 = "";
    try {
      for (; 9 !== t2?.nodeType; ) {
        const n2 = t2, i2 = n2.id ? "#" + n2.id : [o(n2), ...Array.from(n2.classList).sort()].join(".");
        if (e2.length + i2.length > 99) return e2 || i2;
        if (e2 = e2 ? i2 + ">" + e2 : i2, n2.id) break;
        t2 = n2.parentNode;
      }
    } catch {
    }
    return e2;
  };
  var r = /* @__PURE__ */ new WeakMap();
  function s(t2, e2) {
    return r.get(t2) || r.set(t2, new e2()), r.get(t2);
  }
  var a = -1;
  var c = () => a;
  var u = (t2) => {
    addEventListener("pageshow", (e2) => {
      e2.persisted && (a = e2.timeStamp, t2(e2));
    }, true);
  };
  var d = (t2, e2, n2, o2) => {
    let i2, r2;
    return (s2) => {
      e2.value >= 0 && (s2 || o2) && (r2 = e2.value - (i2 ?? 0), (r2 || void 0 === i2) && (i2 = e2.value, e2.delta = r2, e2.rating = ((t3, e3) => t3 > e3[1] ? "poor" : t3 > e3[0] ? "needs-improvement" : "good")(e2.value, n2), t2(e2)));
    };
  };
  var f = (t2) => {
    requestAnimationFrame(() => requestAnimationFrame(() => t2()));
  };
  var l = () => {
    const t2 = e();
    return t2?.activationStart ?? 0;
  };
  var h = (t2, n2 = -1) => {
    const o2 = e();
    let i2 = "navigate";
    c() >= 0 ? i2 = "back-forward-cache" : o2 && (document.prerendering || l() > 0 ? i2 = "prerender" : document.wasDiscarded ? i2 = "restore" : o2.type && (i2 = o2.type.replace(/_/g, "-")));
    return {
      name: t2,
      value: n2,
      rating: "good",
      delta: 0,
      entries: [],
      id: `v5-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 1e12}`,
      navigationType: i2
    };
  };
  var m = (t2, e2, n2 = {}) => {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(t2)) {
        const o2 = new PerformanceObserver((t3) => {
          Promise.resolve().then(() => {
            e2(t3.getEntries());
          });
        });
        return o2.observe({
          type: t2,
          buffered: true,
          ...n2
        }), o2;
      }
    } catch {
    }
  };
  var g = (t2) => {
    let e2 = false;
    return () => {
      e2 || (t2(), e2 = true);
    };
  };
  var p = -1;
  var y = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0;
  var v = (t2) => {
    "hidden" === document.visibilityState && p > -1 && (p = "visibilitychange" === t2.type ? t2.timeStamp : 0, M());
  };
  var b = () => {
    addEventListener("visibilitychange", v, true), addEventListener("prerenderingchange", v, true);
  };
  var M = () => {
    removeEventListener("visibilitychange", v, true), removeEventListener("prerenderingchange", v, true);
  };
  var T = () => {
    if (p < 0) {
      const t2 = l(), e2 = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").filter((e3) => "hidden" === e3.name && e3.startTime > t2)[0]?.startTime;
      p = e2 ?? y(), b(), u(() => {
        setTimeout(() => {
          p = y(), b();
        });
      });
    }
    return {
      get firstHiddenTime() {
        return p;
      }
    };
  };
  var D = (t2) => {
    document.prerendering ? addEventListener("prerenderingchange", () => t2(), true) : t2();
  };
  var E = [1800, 3e3];
  var P = (t2, e2 = {}) => {
    D(() => {
      const n2 = T();
      let o2, i2 = h("FCP");
      const r2 = m("paint", (t3) => {
        for (const e3 of t3) "first-contentful-paint" === e3.name && (r2.disconnect(), e3.startTime < n2.firstHiddenTime && (i2.value = Math.max(e3.startTime - l(), 0), i2.entries.push(e3), o2(true)));
      });
      r2 && (o2 = d(t2, i2, E, e2.reportAllChanges), u((n3) => {
        i2 = h("FCP"), o2 = d(t2, i2, E, e2.reportAllChanges), f(() => {
          i2.value = performance.now() - n3.timeStamp, o2(true);
        });
      }));
    });
  };
  var L = [0.1, 0.25];
  var S = (t2) => t2.find((t3) => 1 === t3.node?.nodeType) || t2[0];
  var _ = (e2, o2 = {}) => {
    const r2 = s(o2 = Object.assign({}, o2), t), a2 = /* @__PURE__ */ new WeakMap();
    r2.t = (t2) => {
      if (t2?.sources?.length) {
        const e3 = S(t2.sources);
        if (e3) {
          const t3 = (o2.generateTarget ?? i)(e3.node);
          a2.set(e3, t3);
        }
      }
    };
    ((e3, n2 = {}) => {
      P(g(() => {
        let o3, i2 = h("CLS", 0);
        const r3 = s(n2, t), a3 = (t2) => {
          for (const e4 of t2) r3.u(e4);
          r3.o > i2.value && (i2.value = r3.o, i2.entries = r3.i, o3());
        }, c2 = m("layout-shift", a3);
        c2 && (o3 = d(e3, i2, L, n2.reportAllChanges), document.addEventListener("visibilitychange", () => {
          "hidden" === document.visibilityState && (a3(c2.takeRecords()), o3(true));
        }), u(() => {
          r3.o = 0, i2 = h("CLS", 0), o3 = d(e3, i2, L, n2.reportAllChanges), f(() => o3());
        }), setTimeout(o3));
      }));
    })((t2) => {
      const o3 = ((t3) => {
        let e3 = {};
        if (t3.entries.length) {
          const o4 = t3.entries.reduce((t4, e4) => t4.value > e4.value ? t4 : e4);
          if (o4?.sources?.length) {
            const t4 = S(o4.sources);
            t4 && (e3 = {
              largestShiftTarget: a2.get(t4),
              largestShiftTime: o4.startTime,
              largestShiftValue: o4.value,
              largestShiftSource: t4,
              largestShiftEntry: o4,
              loadState: n(o4.startTime)
            });
          }
        }
        return Object.assign(t3, {
          attribution: e3
        });
      })(t2);
      e2(o3);
    }, o2);
  };
  var w = (t2, o2 = {}) => {
    P((o3) => {
      const i2 = ((t3) => {
        let o4 = {
          timeToFirstByte: 0,
          firstByteToFCP: t3.value,
          loadState: n(c())
        };
        if (t3.entries.length) {
          const i3 = e(), r2 = t3.entries.at(-1);
          if (i3) {
            const e2 = i3.activationStart || 0, s2 = Math.max(0, i3.responseStart - e2);
            o4 = {
              timeToFirstByte: s2,
              firstByteToFCP: t3.value - s2,
              loadState: n(t3.entries[0].startTime),
              navigationEntry: i3,
              fcpEntry: r2
            };
          }
        }
        return Object.assign(t3, {
          attribution: o4
        });
      })(o3);
      t2(i2);
    }, o2);
  };
  var k = 0;
  var F = 1 / 0;
  var B = 0;
  var C = (t2) => {
    for (const e2 of t2) e2.interactionId && (F = Math.min(F, e2.interactionId), B = Math.max(B, e2.interactionId), k = B ? (B - F) / 7 + 1 : 0);
  };
  var O;
  var j = () => O ? k : performance.interactionCount ?? 0;
  var I = () => {
    "interactionCount" in performance || O || (O = m("event", C, {
      type: "event",
      buffered: true,
      durationThreshold: 0
    }));
  };
  var A = 0;
  var W = class {
    l = [];
    h = /* @__PURE__ */ new Map();
    m;
    p;
    v() {
      A = j(), this.l.length = 0, this.h.clear();
    }
    M() {
      const t2 = Math.min(this.l.length - 1, Math.floor((j() - A) / 50));
      return this.l[t2];
    }
    u(t2) {
      if (this.m?.(t2), !t2.interactionId && "first-input" !== t2.entryType) return;
      const e2 = this.l.at(-1);
      let n2 = this.h.get(t2.interactionId);
      if (n2 || this.l.length < 10 || t2.duration > e2.T) {
        if (n2 ? t2.duration > n2.T ? (n2.entries = [t2], n2.T = t2.duration) : t2.duration === n2.T && t2.startTime === n2.entries[0].startTime && n2.entries.push(t2) : (n2 = {
          id: t2.interactionId,
          entries: [t2],
          T: t2.duration
        }, this.h.set(n2.id, n2), this.l.push(n2)), this.l.sort((t3, e3) => e3.T - t3.T), this.l.length > 10) {
          const t3 = this.l.splice(10);
          for (const e3 of t3) this.h.delete(e3.id);
        }
        this.p?.(n2);
      }
    }
  };
  var q = (t2) => {
    const e2 = globalThis.requestIdleCallback || setTimeout;
    "hidden" === document.visibilityState ? t2() : (t2 = g(t2), document.addEventListener("visibilitychange", t2, {
      once: true
    }), e2(() => {
      t2(), document.removeEventListener("visibilitychange", t2);
    }));
  };
  var x = [200, 500];
  var N = (t2, e2 = {}) => {
    const o2 = s(e2 = Object.assign({}, e2), W);
    let r2 = [], a2 = [], c2 = 0;
    const f2 = /* @__PURE__ */ new WeakMap(), l2 = /* @__PURE__ */ new WeakMap();
    let g2 = false;
    const p2 = () => {
      g2 || (q(y2), g2 = true);
    }, y2 = () => {
      const t3 = o2.l.map((t4) => f2.get(t4.entries[0])), e3 = a2.length - 50;
      a2 = a2.filter((n3, o3) => o3 >= e3 || t3.includes(n3));
      const n2 = /* @__PURE__ */ new Set();
      for (const t4 of a2) {
        const e4 = v2(t4.startTime, t4.processingEnd);
        for (const t5 of e4) n2.add(t5);
      }
      const i2 = r2.length - 1 - 50;
      r2 = r2.filter((t4, e4) => t4.startTime > c2 && e4 > i2 || n2.has(t4)), g2 = false;
    };
    o2.m = (t3) => {
      const e3 = t3.startTime + t3.duration;
      let n2;
      c2 = Math.max(c2, t3.processingEnd);
      for (let o3 = a2.length - 1; o3 >= 0; o3--) {
        const i2 = a2[o3];
        if (Math.abs(e3 - i2.renderTime) <= 8) {
          n2 = i2, n2.startTime = Math.min(t3.startTime, n2.startTime), n2.processingStart = Math.min(t3.processingStart, n2.processingStart), n2.processingEnd = Math.max(t3.processingEnd, n2.processingEnd), n2.entries.push(t3);
          break;
        }
      }
      n2 || (n2 = {
        startTime: t3.startTime,
        processingStart: t3.processingStart,
        processingEnd: t3.processingEnd,
        renderTime: e3,
        entries: [t3]
      }, a2.push(n2)), (t3.interactionId || "first-input" === t3.entryType) && f2.set(t3, n2), p2();
    }, o2.p = (t3) => {
      if (!l2.get(t3)) {
        const n2 = (e2.generateTarget ?? i)(t3.entries[0].target);
        l2.set(t3, n2);
      }
    };
    const v2 = (t3, e3) => {
      const n2 = [];
      for (const o3 of r2) if (!(o3.startTime + o3.duration < t3)) {
        if (o3.startTime > e3) break;
        n2.push(o3);
      }
      return n2;
    }, b2 = (t3) => {
      const e3 = t3.entries[0], i2 = f2.get(e3), r3 = e3.processingStart, s2 = Math.max(e3.startTime + e3.duration, r3), a3 = Math.min(i2.processingEnd, s2), c3 = i2.entries.sort((t4, e4) => t4.processingStart - e4.processingStart), u2 = v2(e3.startTime, a3), d2 = o2.h.get(e3.interactionId), h2 = {
        interactionTarget: l2.get(d2),
        interactionType: e3.name.startsWith("key") ? "keyboard" : "pointer",
        interactionTime: e3.startTime,
        nextPaintTime: s2,
        processedEventEntries: c3,
        longAnimationFrameEntries: u2,
        inputDelay: r3 - e3.startTime,
        processingDuration: a3 - r3,
        presentationDelay: s2 - a3,
        loadState: n(e3.startTime),
        longestScript: void 0,
        totalScriptDuration: void 0,
        totalStyleAndLayoutDuration: void 0,
        totalPaintDuration: void 0,
        totalUnattributedDuration: void 0
      };
      ((t4) => {
        if (!t4.longAnimationFrameEntries?.length) return;
        const e4 = t4.interactionTime, n2 = t4.inputDelay, o3 = t4.processingDuration;
        let i3, r4, s3 = 0, a4 = 0, c4 = 0, u3 = 0;
        for (const c5 of t4.longAnimationFrameEntries) {
          a4 = a4 + c5.startTime + c5.duration - c5.styleAndLayoutStart;
          for (const t5 of c5.scripts) {
            const c6 = t5.startTime + t5.duration;
            if (c6 < e4) continue;
            const d4 = c6 - Math.max(e4, t5.startTime), f4 = t5.duration ? d4 / t5.duration * t5.forcedStyleAndLayoutDuration : 0;
            s3 += d4 - f4, a4 += f4, d4 > u3 && (r4 = t5.startTime < e4 + n2 ? "input-delay" : t5.startTime >= e4 + n2 + o3 ? "presentation-delay" : "processing-duration", i3 = t5, u3 = d4);
          }
        }
        const d3 = t4.longAnimationFrameEntries.at(-1), f3 = d3 ? d3.startTime + d3.duration : 0;
        f3 >= e4 + n2 + o3 && (c4 = t4.nextPaintTime - f3), i3 && r4 && (t4.longestScript = {
          entry: i3,
          subpart: r4,
          intersectingDuration: u3
        }), t4.totalScriptDuration = s3, t4.totalStyleAndLayoutDuration = a4, t4.totalPaintDuration = c4, t4.totalUnattributedDuration = t4.nextPaintTime - e4 - s3 - a4 - c4;
      })(h2);
      return Object.assign(t3, {
        attribution: h2
      });
    };
    m("long-animation-frame", (t3) => {
      r2 = r2.concat(t3), p2();
    }), ((t3, e3 = {}) => {
      globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype && D(() => {
        I();
        let n2, o3 = h("INP");
        const i2 = s(e3, W), r3 = (t4) => {
          q(() => {
            for (const e5 of t4) i2.u(e5);
            const e4 = i2.M();
            e4 && e4.T !== o3.value && (o3.value = e4.T, o3.entries = e4.entries, n2());
          });
        }, a3 = m("event", r3, {
          durationThreshold: e3.durationThreshold ?? 40
        });
        n2 = d(t3, o3, x, e3.reportAllChanges), a3 && (a3.observe({
          type: "first-input",
          buffered: true
        }), document.addEventListener("visibilitychange", () => {
          "hidden" === document.visibilityState && (r3(a3.takeRecords()), n2(true));
        }), u(() => {
          i2.v(), o3 = h("INP"), n2 = d(t3, o3, x, e3.reportAllChanges);
        }));
      });
    })((e3) => {
      const n2 = b2(e3);
      t2(n2);
    }, e2);
  };
  var R = class {
    m;
    u(t2) {
      this.m?.(t2);
    }
  };
  var U = [2500, 4e3];
  var V = (t2, n2 = {}) => {
    const o2 = s(n2 = Object.assign({}, n2), R), r2 = /* @__PURE__ */ new WeakMap();
    o2.m = (t3) => {
      if (t3.element) {
        const e2 = (n2.generateTarget ?? i)(t3.element);
        r2.set(t3, e2);
      }
    };
    ((t3, e2 = {}) => {
      D(() => {
        const n3 = T();
        let o3, i2 = h("LCP");
        const r3 = s(e2, R), a2 = (t4) => {
          e2.reportAllChanges || (t4 = t4.slice(-1));
          for (const e3 of t4) r3.u(e3), e3.startTime < n3.firstHiddenTime && (i2.value = Math.max(e3.startTime - l(), 0), i2.entries = [e3], o3());
        }, c2 = m("largest-contentful-paint", a2);
        if (c2) {
          o3 = d(t3, i2, U, e2.reportAllChanges);
          const n4 = g(() => {
            a2(c2.takeRecords()), c2.disconnect(), o3(true);
          });
          for (const t4 of ["keydown", "click", "visibilitychange"]) addEventListener(t4, () => q(n4), {
            capture: true,
            once: true
          });
          u((n5) => {
            i2 = h("LCP"), o3 = d(t3, i2, U, e2.reportAllChanges), f(() => {
              i2.value = performance.now() - n5.timeStamp, o3(true);
            });
          });
        }
      });
    })((n3) => {
      const o3 = ((t3) => {
        let n4 = {
          timeToFirstByte: 0,
          resourceLoadDelay: 0,
          resourceLoadDuration: 0,
          elementRenderDelay: t3.value
        };
        if (t3.entries.length) {
          const o4 = e();
          if (o4) {
            const e2 = o4.activationStart || 0, i2 = t3.entries.at(-1), s2 = i2.url && performance.getEntriesByType("resource").filter((t4) => t4.name === i2.url)[0], a2 = Math.max(0, o4.responseStart - e2), c2 = Math.max(a2, s2 ? (s2.requestStart || s2.startTime) - e2 : 0), u2 = Math.min(t3.value, Math.max(c2, s2 ? s2.responseEnd - e2 : 0));
            n4 = {
              target: r2.get(i2),
              timeToFirstByte: a2,
              resourceLoadDelay: c2 - a2,
              resourceLoadDuration: u2 - c2,
              elementRenderDelay: t3.value - u2,
              navigationEntry: o4,
              lcpEntry: i2
            }, i2.url && (n4.url = i2.url), s2 && (n4.lcpResourceEntry = s2);
          }
        }
        return Object.assign(t3, {
          attribution: n4
        });
      })(n3);
      t2(o3);
    }, n2);
  };
  var $ = [800, 1800];
  var H = (t2) => {
    document.prerendering ? D(() => H(t2)) : "complete" !== document.readyState ? addEventListener("load", () => H(t2), true) : setTimeout(t2);
  };
  var z = (t2, n2 = {}) => {
    ((t3, n3 = {}) => {
      let o2 = h("TTFB"), i2 = d(t3, o2, $, n3.reportAllChanges);
      H(() => {
        const r2 = e();
        r2 && (o2.value = Math.max(r2.responseStart - l(), 0), o2.entries = [r2], i2(true), u(() => {
          o2 = h("TTFB", 0), i2 = d(t3, o2, $, n3.reportAllChanges), i2(true);
        }));
      });
    })((e2) => {
      const n3 = ((t3) => {
        let e3 = {
          waitingDuration: 0,
          cacheDuration: 0,
          dnsDuration: 0,
          connectionDuration: 0,
          requestDuration: 0
        };
        if (t3.entries.length) {
          const n4 = t3.entries[0], o2 = n4.activationStart || 0, i2 = Math.max((n4.workerStart || n4.fetchStart) - o2, 0), r2 = Math.max(n4.domainLookupStart - o2, 0), s2 = Math.max(n4.connectStart - o2, 0), a2 = Math.max(n4.connectEnd - o2, 0);
          e3 = {
            waitingDuration: i2,
            cacheDuration: r2 - i2,
            dnsDuration: s2 - r2,
            connectionDuration: a2 - s2,
            requestDuration: t3.value - a2,
            navigationEntry: n4
          };
        }
        return Object.assign(t3, {
          attribution: e3
        });
      })(e2);
      t2(n3);
    }, n2);
  };
  var ATTR_BROWSER_NAME = "browser.name";
  var ATTR_BROWSER_VERSION = "browser.version";
  var ATTR_BROWSER_TOUCH_SCREEN_ENABLED = "browser.touch_screen_enabled";
  var ATTR_BROWSER_WIDTH = "browser.width";
  var ATTR_BROWSER_HEIGHT = "browser.height";
  var ATTR_DEVICE_TYPE = "device.type";
  var ATTR_NETWORK_EFFECTIVE_TYPE = "network.effectiveType";
  var ATTR_SCREEN_WIDTH = "screen.width";
  var ATTR_SCREEN_HEIGHT = "screen.height";
  var ATTR_SCREEN_SIZE = "screen.size";
  var ATTR_PAGE_HASH = "page.hash";
  var ATTR_PAGE_URL = "page.url";
  var ATTR_PAGE_ROUTE = "page.route";
  var ATTR_PAGE_HOSTNAME = "page.hostname";
  var ATTR_PAGE_SEARCH = "page.search";
  var ATTR_URL_PATH = "url.path";
  var ATTR_ENTRY_PAGE_URL = "entry_page.url";
  var ATTR_ENTRY_PAGE_PATH = "entry_page.path";
  var ATTR_ENTRY_PAGE_SEARCH = "entry_page.search";
  var ATTR_ENTRY_PAGE_HASH = "entry_page.hash";
  var ATTR_ENTRY_PAGE_HOSTNAME = "entry_page.hostname";
  var ATTR_ENTRY_PAGE_REFERRER = "entry_page.referrer";
  var ATTR_HONEYCOMB_DISTRO_VERSION = "honeycomb.distro.version";
  var ATTR_HONEYCOMB_DISTRO_RUNTIME_VERSION = "honeycomb.distro.runtime_version";
  var ATTR_CLS_ID = "cls.id";
  var ATTR_CLS_VALUE = "cls.value";
  var ATTR_CLS_DELTA = "cls.delta";
  var ATTR_CLS_RATING = "cls.rating";
  var ATTR_CLS_NAVIGATION_TYPE = "cls.navigation_type";
  var ATTR_LCP_ID = "lcp.id";
  var ATTR_LCP_VALUE = "lcp.value";
  var ATTR_LCP_DELTA = "lcp.delta";
  var ATTR_LCP_RATING = "lcp.rating";
  var ATTR_LCP_NAVIGATION_TYPE = "lcp.navigation_type";
  var ATTR_INP_ID = "inp.id";
  var ATTR_INP_VALUE = "inp.value";
  var ATTR_INP_DELTA = "inp.delta";
  var ATTR_INP_RATING = "inp.rating";
  var ATTR_INP_NAVIGATION_TYPE = "inp.navigation_type";
  var ATTR_FCP_ID = "fcp.id";
  var ATTR_FCP_VALUE = "fcp.value";
  var ATTR_FCP_DELTA = "fcp.delta";
  var ATTR_FCP_RATING = "fcp.rating";
  var ATTR_FCP_NAVIGATION_TYPE = "fcp.navigation_type";
  var ATTR_TTFB_ID = "ttfb.id";
  var ATTR_TTFB_VALUE = "ttfb.value";
  var ATTR_TTFB_DELTA = "ttfb.delta";
  var ATTR_TTFB_RATING = "ttfb.rating";
  var ATTR_TTFB_NAVIGATION_TYPE = "ttfb.navigation_type";
  var ATTR_CLS_LARGEST_SHIFT_TARGET = "cls.largest_shift_target";
  var ATTR_CLS_ELEMENT = "cls.element";
  var ATTR_CLS_LARGEST_SHIFT_TIME = "cls.largest_shift_time";
  var ATTR_CLS_LARGEST_SHIFT_VALUE = "cls.largest_shift_value";
  var ATTR_CLS_LOAD_STATE = "cls.load_state";
  var ATTR_CLS_HAD_RECENT_INPUT = "cls.had_recent_input";
  var ATTR_LCP_ELEMENT = "lcp.element";
  var ATTR_LCP_URL = "lcp.url";
  var ATTR_LCP_TIME_TO_FIRST_BYTE = "lcp.time_to_first_byte";
  var ATTR_LCP_RESOURCE_LOAD_DELAY = "lcp.resource_load_delay";
  var ATTR_LCP_RESOURCE_LOAD_DURATION = "lcp.resource_load_duration";
  var ATTR_LCP_ELEMENT_RENDER_DELAY = "lcp.element_render_delay";
  var ATTR_LCP_RESOURCE_LOAD_TIME = "lcp.resource_load_time";
  var ATTR_INP_INPUT_DELAY = "inp.input_delay";
  var ATTR_INP_INTERACTION_TARGET = "inp.interaction_target";
  var ATTR_INP_INTERACTION_TIME = "inp.interaction_time";
  var ATTR_INP_INTERACTION_TYPE = "inp.interaction_type";
  var ATTR_INP_LOAD_STATE = "inp.load_state";
  var ATTR_INP_NEXT_PAINT_TIME = "inp.next_paint_time";
  var ATTR_INP_PRESENTATION_DELAY = "inp.presentation_delay";
  var ATTR_INP_PROCESSING_DURATION = "inp.processing_duration";
  var ATTR_INP_DURATION = "inp.duration";
  var ATTR_INP_ELEMENT = "inp.element";
  var ATTR_INP_EVENT_TYPE = "inp.event_type";
  var ATTR_INP_SCRIPT_ENTRY_TYPE = "inp.timing.script.entry_type";
  var ATTR_INP_SCRIPT_START_TIME = "inp.timing.script.start_time";
  var ATTR_INP_SCRIPT_EXECUTION_START = "inp.timing.script.execution_start";
  var ATTR_INP_SCRIPT_DURATION = "inp.timing.script.duration";
  var ATTR_INP_SCRIPT_FORCED_STYLE_AND_LAYOUT_DURATION = "inp.timing.script.forced_style_and_layout_duration";
  var ATTR_INP_SCRIPT_INVOKER = "inp.timing.script.invoker";
  var ATTR_INP_SCRIPT_PAUSE_DURATION = "inp.timing.script.pause_duration";
  var ATTR_INP_SCRIPT_SOURCE_URL = "inp.timing.script.source_url";
  var ATTR_INP_SCRIPT_SOURCE_FUNCTION_NAME = "inp.timing.script.source_function_name";
  var ATTR_INP_SCRIPT_SOURCE_CHAR_POSITION = "inp.timing.script.source_char_position";
  var ATTR_INP_SCRIPT_WINDOW_ATTRIBUTION = "inp.timing.script.window_attribution";
  var ATTR_INP_TIMING_DURATION = "inp.timing.duration";
  var ATTR_INP_TIMING_ENTRY_TYPE = "inp.timing.entryType";
  var ATTR_INP_TIMING_NAME = "inp.timing.name";
  var ATTR_INP_TIMING_RENDER_START = "inp.timing.renderStart";
  var ATTR_INP_TIMING_START_TIME = "inp.timing.startTime";
  var ATTR_FCP_TIME_TO_FIRST_BYTE = "fcp.time_to_first_byte";
  var ATTR_FCP_TIME_SINCE_FIRST_BYTE = "fcp.time_since_first_byte";
  var ATTR_FCP_LOAD_STATE = "fcp.load_state";
  var ATTR_TTFB_WAITING_DURATION = "ttfb.waiting_duration";
  var ATTR_TTFB_DNS_DURATION = "ttfb.dns_duration";
  var ATTR_TTFB_CONNECTION_DURATION = "ttfb.connection_duration";
  var ATTR_TTFB_REQUEST_DURATION = "ttfb.request_duration";
  var ATTR_TTFB_CACHE_DURATION = "ttfb.cache_duration";
  var ATTR_TTFB_WAITING_TIME = "ttfb.waiting_time";
  var ATTR_TTFB_DNS_TIME = "ttfb.dns_time";
  var ATTR_TTFB_CONNECTION_TIME = "ttfb.connection_time";
  var ATTR_TTFB_REQUEST_TIME = "ttfb.request_time";
  var InstrumentationAbstract2 = class {
    constructor(instrumentationName, instrumentationVersion, config = {}) {
      this.instrumentationName = instrumentationName;
      this.instrumentationVersion = instrumentationVersion;
      this._wrap = shimmer2.wrap;
      this._unwrap = shimmer2.unwrap;
      this._massWrap = shimmer2.massWrap;
      this._massUnwrap = shimmer2.massUnwrap;
      this._config = Object.assign({
        enabled: true
      }, config);
      this._diag = diag2.createComponentLogger({
        namespace: instrumentationName
      });
      this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
      this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Returns meter */
    get meter() {
      return this._meter;
    }
    /**
     * Sets MeterProvider to this plugin
     * @param meterProvider
     */
    setMeterProvider(meterProvider) {
      this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
      this._updateMetricInstruments();
    }
    /**
     * Sets the new metric instruments with the current Meter.
     */
    _updateMetricInstruments() {
      return;
    }
    /* Returns InstrumentationConfig */
    getConfig() {
      return this._config;
    }
    /**
     * Sets InstrumentationConfig to this plugin
     * @param InstrumentationConfig
     */
    setConfig(config = {}) {
      this._config = Object.assign({}, config);
    }
    /**
     * Sets TraceProvider to this plugin
     * @param tracerProvider
     */
    setTracerProvider(tracerProvider) {
      this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    }
    /* Returns tracer */
    get tracer() {
      return this._tracer;
    }
  };
  var WebVitalsInstrumentation = class extends InstrumentationAbstract2 {
    constructor({
      enabled = true,
      vitalsToTrack = ["CLS", "LCP", "INP", "TTFB", "FCP"],
      lcp,
      cls,
      inp,
      fcp,
      ttfb
    } = {}) {
      const config = {
        enabled,
        vitalsToTrack,
        lcp,
        cls,
        inp,
        fcp,
        ttfb
      };
      super("@honeycombio/instrumentation-web-vitals", VERSION4, config);
      this.onReportCLS = (cls2, clsOpts = {}) => {
        const {
          applyCustomAttributes
        } = clsOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = cls2;
        const {
          largestShiftTarget,
          largestShiftTime,
          largestShiftValue,
          loadState,
          largestShiftEntry
        } = attribution;
        const span = this.tracer.startSpan(name);
        span.setAttributes({
          [ATTR_CLS_ID]: cls2.id,
          [ATTR_CLS_DELTA]: cls2.delta,
          [ATTR_CLS_VALUE]: cls2.value,
          [ATTR_CLS_RATING]: cls2.rating,
          [ATTR_CLS_NAVIGATION_TYPE]: cls2.navigationType,
          [ATTR_CLS_LARGEST_SHIFT_TARGET]: largestShiftTarget,
          [ATTR_CLS_ELEMENT]: largestShiftTarget,
          [ATTR_CLS_LARGEST_SHIFT_TIME]: largestShiftTime,
          [ATTR_CLS_LARGEST_SHIFT_VALUE]: largestShiftValue,
          [ATTR_CLS_LOAD_STATE]: loadState,
          [ATTR_CLS_HAD_RECENT_INPUT]: largestShiftEntry === null || largestShiftEntry === void 0 ? void 0 : largestShiftEntry.hadRecentInput
        });
        if (applyCustomAttributes) {
          applyCustomAttributes(cls2, span);
        }
        span.end();
      };
      this.onReportLCP = (lcp2, lcpOpts = {}) => {
        const {
          applyCustomAttributes,
          dataAttributes
        } = lcpOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = lcp2;
        const {
          target,
          url,
          timeToFirstByte,
          resourceLoadDelay,
          resourceLoadDuration,
          elementRenderDelay,
          lcpEntry
        } = attribution;
        const span = this.tracer.startSpan(name);
        span.setAttributes({
          [ATTR_LCP_ID]: lcp2.id,
          [ATTR_LCP_DELTA]: lcp2.delta,
          [ATTR_LCP_VALUE]: lcp2.value,
          [ATTR_LCP_RATING]: lcp2.rating,
          [ATTR_LCP_NAVIGATION_TYPE]: lcp2.navigationType,
          [ATTR_LCP_ELEMENT]: target,
          [ATTR_LCP_URL]: url,
          [ATTR_LCP_TIME_TO_FIRST_BYTE]: timeToFirstByte,
          [ATTR_LCP_RESOURCE_LOAD_DELAY]: resourceLoadDelay,
          [ATTR_LCP_RESOURCE_LOAD_DURATION]: resourceLoadDuration,
          [ATTR_LCP_ELEMENT_RENDER_DELAY]: elementRenderDelay,
          // This will be deprecated in a future version
          [ATTR_LCP_RESOURCE_LOAD_TIME]: resourceLoadDuration
        });
        this.addDataAttributes(lcpEntry === null || lcpEntry === void 0 ? void 0 : lcpEntry.element, span, dataAttributes, "lcp");
        if (applyCustomAttributes) {
          applyCustomAttributes(lcp2, span);
        }
        span.end();
      };
      this.onReportINP = (inp2, inpOpts = {
        includeTimingsAsSpans: false
      }) => {
        const {
          applyCustomAttributes,
          includeTimingsAsSpans,
          dataAttributes
        } = inpOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = inp2;
        const {
          inputDelay,
          interactionTarget,
          interactionTime,
          interactionType,
          loadState,
          nextPaintTime,
          presentationDelay,
          processingDuration,
          longAnimationFrameEntries
        } = attribution;
        const inpDuration = inputDelay + processingDuration + presentationDelay;
        this.tracer.startActiveSpan(name, {
          startTime: interactionTime
        }, (inpSpan) => {
          const inpAttributes = {
            [ATTR_INP_ID]: inp2.id,
            [ATTR_INP_DELTA]: inp2.delta,
            [ATTR_INP_VALUE]: inp2.value,
            [ATTR_INP_RATING]: inp2.rating,
            [ATTR_INP_NAVIGATION_TYPE]: inp2.navigationType,
            [ATTR_INP_INPUT_DELAY]: inputDelay,
            [ATTR_INP_INTERACTION_TARGET]: interactionTarget,
            [ATTR_INP_INTERACTION_TIME]: interactionTime,
            [ATTR_INP_INTERACTION_TYPE]: interactionType,
            [ATTR_INP_LOAD_STATE]: loadState,
            [ATTR_INP_NEXT_PAINT_TIME]: nextPaintTime,
            [ATTR_INP_PRESENTATION_DELAY]: presentationDelay,
            [ATTR_INP_PROCESSING_DURATION]: processingDuration,
            [ATTR_INP_DURATION]: inpDuration,
            // These will be deprecated in a future version
            [ATTR_INP_ELEMENT]: interactionTarget,
            [ATTR_INP_EVENT_TYPE]: interactionType
          };
          inpSpan.setAttributes(inpAttributes);
          inp2.entries.forEach((inpEntry) => {
            this.addDataAttributes(this.getElementFromNode(inpEntry.target), inpSpan, dataAttributes, "inp");
          });
          if (applyCustomAttributes) {
            applyCustomAttributes(inp2, inpSpan);
          }
          if (includeTimingsAsSpans) {
            longAnimationFrameEntries.forEach((perfEntry) => {
              this.processPerformanceLongAnimationFrameTimingSpans("inp", perfEntry);
            });
          }
          inpSpan.end(interactionTime + inpDuration);
        });
      };
      this.onReportFCP = (fcp2, fcpOpts = {}) => {
        const {
          applyCustomAttributes
        } = fcpOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = fcp2;
        const {
          timeToFirstByte,
          firstByteToFCP,
          loadState
        } = attribution;
        const span = this.tracer.startSpan(name);
        span.setAttributes({
          [ATTR_FCP_ID]: fcp2.id,
          [ATTR_FCP_DELTA]: fcp2.delta,
          [ATTR_FCP_VALUE]: fcp2.value,
          [ATTR_FCP_RATING]: fcp2.rating,
          [ATTR_FCP_NAVIGATION_TYPE]: fcp2.navigationType,
          [ATTR_FCP_TIME_TO_FIRST_BYTE]: timeToFirstByte,
          [ATTR_FCP_TIME_SINCE_FIRST_BYTE]: firstByteToFCP,
          [ATTR_FCP_LOAD_STATE]: loadState
        });
        if (applyCustomAttributes) {
          applyCustomAttributes(fcp2, span);
        }
        span.end();
      };
      this.onReportTTFB = (ttfb2, ttfbOpts = {}) => {
        const {
          applyCustomAttributes
        } = ttfbOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = ttfb2;
        const {
          cacheDuration,
          connectionDuration,
          dnsDuration,
          requestDuration,
          waitingDuration
        } = attribution;
        const attributes = {
          [ATTR_TTFB_ID]: ttfb2.id,
          [ATTR_TTFB_DELTA]: ttfb2.delta,
          [ATTR_TTFB_VALUE]: ttfb2.value,
          [ATTR_TTFB_RATING]: ttfb2.rating,
          [ATTR_TTFB_NAVIGATION_TYPE]: ttfb2.navigationType,
          [ATTR_TTFB_WAITING_DURATION]: waitingDuration,
          [ATTR_TTFB_DNS_DURATION]: dnsDuration,
          [ATTR_TTFB_CONNECTION_DURATION]: connectionDuration,
          [ATTR_TTFB_REQUEST_DURATION]: requestDuration,
          [ATTR_TTFB_CACHE_DURATION]: cacheDuration,
          // These will be deprecated ina future version
          [ATTR_TTFB_WAITING_TIME]: waitingDuration,
          [ATTR_TTFB_DNS_TIME]: dnsDuration,
          [ATTR_TTFB_CONNECTION_TIME]: connectionDuration,
          [ATTR_TTFB_REQUEST_TIME]: requestDuration
        };
        const span = this.tracer.startSpan(name);
        span.setAttributes(attributes);
        if (applyCustomAttributes) {
          applyCustomAttributes(ttfb2, span);
        }
        span.end();
      };
      this.vitalsToTrack = [...vitalsToTrack];
      this.lcpOpts = lcp;
      this.clsOpts = cls;
      this.inpOpts = inp;
      this.fcpOpts = fcp;
      this.ttfbOpts = ttfb;
      this._isEnabled = enabled;
      this._setupWebVitalsCallbacks();
    }
    init() {
    }
    _setupWebVitalsCallbacks() {
      if (this.vitalsToTrack.includes("CLS")) {
        _((vital) => {
          this.onReportCLS(vital, this.clsOpts);
        }, this.clsOpts);
      }
      if (this.vitalsToTrack.includes("LCP")) {
        V((vital) => {
          this.onReportLCP(vital, this.lcpOpts);
        }, this.lcpOpts);
      }
      if (this.vitalsToTrack.includes("INP")) {
        N((vital) => {
          this.onReportINP(vital, this.inpOpts);
        }, this.inpOpts);
      }
      if (this.vitalsToTrack.includes("TTFB")) {
        z((vital) => {
          this.onReportTTFB(vital, this.ttfbOpts);
        }, this.ttfbOpts);
      }
      if (this.vitalsToTrack.includes("FCP")) {
        w((vital) => {
          this.onReportFCP(vital, this.fcpOpts);
        }, this.fcpOpts);
      }
    }
    getAttrPrefix(name) {
      return name.toLowerCase();
    }
    getAttributesForPerformanceLongAnimationFrameTiming(perfEntry) {
      const loafAttributes = {
        [ATTR_INP_TIMING_DURATION]: perfEntry.duration,
        [ATTR_INP_TIMING_ENTRY_TYPE]: perfEntry.entryType,
        [ATTR_INP_TIMING_NAME]: perfEntry.name,
        [ATTR_INP_TIMING_RENDER_START]: perfEntry.renderStart,
        [ATTR_INP_TIMING_START_TIME]: perfEntry.startTime
      };
      return loafAttributes;
    }
    getAttributesForPerformanceScriptTiming(scriptPerfEntry) {
      const scriptAttributes = {
        [ATTR_INP_SCRIPT_ENTRY_TYPE]: scriptPerfEntry.entryType,
        [ATTR_INP_SCRIPT_START_TIME]: scriptPerfEntry.startTime,
        [ATTR_INP_SCRIPT_EXECUTION_START]: scriptPerfEntry.executionStart,
        [ATTR_INP_SCRIPT_DURATION]: scriptPerfEntry.duration,
        [ATTR_INP_SCRIPT_FORCED_STYLE_AND_LAYOUT_DURATION]: scriptPerfEntry.forcedStyleAndLayoutDuration,
        [ATTR_INP_SCRIPT_INVOKER]: scriptPerfEntry.invoker,
        [ATTR_INP_SCRIPT_PAUSE_DURATION]: scriptPerfEntry.pauseDuration,
        [ATTR_INP_SCRIPT_SOURCE_URL]: scriptPerfEntry.sourceURL,
        [ATTR_INP_SCRIPT_SOURCE_FUNCTION_NAME]: scriptPerfEntry.sourceFunctionName,
        [ATTR_INP_SCRIPT_SOURCE_CHAR_POSITION]: scriptPerfEntry.sourceCharPosition,
        [ATTR_INP_SCRIPT_WINDOW_ATTRIBUTION]: scriptPerfEntry.windowAttribution
      };
      return scriptAttributes;
    }
    processPerformanceLongAnimationFrameTimingSpans(parentPrefix, perfEntry) {
      if (!perfEntry) return;
      const loafAttributes = this.getAttributesForPerformanceLongAnimationFrameTiming(perfEntry);
      this.tracer.startActiveSpan(perfEntry.name, {
        startTime: perfEntry.startTime
      }, (span) => {
        span.setAttributes(loafAttributes);
        this.processPerformanceScriptTimingSpans(parentPrefix, perfEntry.scripts);
        span.end(perfEntry.startTime + perfEntry.duration);
      });
    }
    processPerformanceScriptTimingSpans(parentPrefix, perfScriptEntries) {
      if (!perfScriptEntries) return;
      if (!(perfScriptEntries === null || perfScriptEntries === void 0 ? void 0 : perfScriptEntries.length)) return;
      perfScriptEntries.map((scriptPerfEntry) => {
        this.tracer.startActiveSpan(scriptPerfEntry.name, {
          startTime: scriptPerfEntry.startTime
        }, (span) => {
          const scriptAttributes = this.getAttributesForPerformanceScriptTiming(scriptPerfEntry);
          span.setAttributes(scriptAttributes);
          span.end(scriptPerfEntry.startTime + scriptPerfEntry.duration);
        });
      });
    }
    getElementFromNode(node) {
      if ((node === null || node === void 0 ? void 0 : node.nodeType) === Node.ELEMENT_NODE) {
        return node;
      }
      return void 0;
    }
    addDataAttributes(element, span, dataAttributes, attrPrefix) {
      const el = element;
      if (el === null || el === void 0 ? void 0 : el.dataset) {
        for (const attrName in el.dataset) {
          const attrValue = el.dataset[attrName];
          if (
            // Value exists (including the empty string AND either
            attrValue !== void 0 && // dataAttributes is undefined (i.e. send all values as span attributes) OR
            (dataAttributes === void 0 || // dataAttributes is specified AND attrName is in dataAttributes (i.e attribute name is in the supplied allowList)
            dataAttributes.includes(attrName))
          ) {
            span.setAttribute(`${attrPrefix}.element.data.${attrName}`, attrValue);
          }
        }
      }
    }
    disable() {
      if (!this.isEnabled()) {
        this._diag.debug(`Instrumentation already disabled`);
        return;
      }
      this._isEnabled = false;
      this._diag.debug(`Instrumentation  disabled`);
    }
    enable() {
      if (this.isEnabled()) {
        this._diag.debug(`Instrumentation already enabled`);
        return;
      }
      this._isEnabled = true;
      this._diag.debug(`Instrumentation  enabled`);
      this._diag.debug(`Sending spans for ${this.vitalsToTrack.join(",")}`);
    }
    isEnabled() {
      return this._isEnabled;
    }
  };
  var LIBRARY_NAME = "@honeycombio/instrumentation-global-errors";
  function getStructuredStackTrace(error) {
    if (!error) {
      return {};
    }
    const structuredStack = (0, import_tracekit.computeStackTrace)(error).stack;
    const lines = [];
    const columns = [];
    const functions = [];
    const urls = [];
    if (!Array.isArray(structuredStack)) {
      return {};
    }
    structuredStack.forEach((stackFrame) => {
      lines.push(stackFrame.line);
      columns.push(stackFrame.column);
      functions.push(stackFrame.func);
      urls.push(stackFrame.url);
    });
    return {
      "exception.structured_stacktrace.columns": columns,
      "exception.structured_stacktrace.lines": lines,
      "exception.structured_stacktrace.functions": functions,
      "exception.structured_stacktrace.urls": urls
    };
  }
  function recordException(error, attributes = {}, tracer = trace.getTracer(LIBRARY_NAME), applyCustomAttributesOnSpan) {
    const message = error.message;
    const type = error.name;
    const errorAttributes = Object.assign(Object.assign({
      [ATTR_EXCEPTION_TYPE]: type,
      [ATTR_EXCEPTION_MESSAGE]: message,
      [ATTR_EXCEPTION_STACKTRACE]: error.stack
    }, getStructuredStackTrace(error)), attributes);
    const errorSpan = tracer.startSpan("exception", {
      attributes: errorAttributes
    }, context.active());
    if (applyCustomAttributesOnSpan) {
      applyCustomAttributesOnSpan(errorSpan, error);
    }
    errorSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message
    });
    errorSpan.end();
  }
  var GlobalErrorsInstrumentation = class extends InstrumentationAbstract2 {
    constructor({
      enabled = true,
      applyCustomAttributesOnSpan
    } = {}) {
      const config = {
        enabled,
        applyCustomAttributesOnSpan
      };
      super(LIBRARY_NAME, VERSION4, config);
      this.onError = (event) => {
        const error = "reason" in event ? event.reason : event.error;
        console.log(this.applyCustomAttributesOnSpan);
        if (error) {
          recordException(error, {}, this.tracer, this.applyCustomAttributesOnSpan);
        }
      };
      if (enabled) {
        this.enable();
      }
      this._isEnabled = enabled;
      this.applyCustomAttributesOnSpan = applyCustomAttributesOnSpan;
    }
    init() {
    }
    disable() {
      if (!this.isEnabled()) {
        this._diag.debug(`Instrumentation already disabled`);
        return;
      }
      this._isEnabled = false;
      window.removeEventListener("error", this.onError);
      window.removeEventListener("unhandledrejection", this.onError);
      this._diag.debug(`Instrumentation  disabled`);
    }
    enable() {
      if (this.isEnabled()) {
        this._diag.debug(`Instrumentation already enabled`);
        return;
      }
      this._isEnabled = true;
      window.addEventListener("error", this.onError);
      window.addEventListener("unhandledrejection", this.onError);
      this._diag.debug(`Instrumentation  enabled`);
    }
    isEnabled() {
      return this._isEnabled;
    }
  };
  var TEAM_HEADER_KEY = "x-honeycomb-team";
  var DATASET_HEADER_KEY = "x-honeycomb-dataset";
  function configureHoneycombHttpJsonTraceExporter(options) {
    const apiKey = getTracesApiKey(options);
    return new OTLPTraceExporter({
      url: getTracesEndpoint(options),
      headers: configureHeaders(options, apiKey, options === null || options === void 0 ? void 0 : options.tracesHeaders),
      timeoutMillis: (options === null || options === void 0 ? void 0 : options.tracesTimeout) || (options === null || options === void 0 ? void 0 : options.timeout) || 1e4
    });
  }
  function configureHoneycombHttpJsonMetricExporter(options) {
    const apiKey = getMetricsApiKey(options);
    return new OTLPMetricExporter({
      url: getMetricsEndpoint(options),
      headers: configureHeaders(options, apiKey, options === null || options === void 0 ? void 0 : options.metricsHeaders, true),
      timeoutMillis: (options === null || options === void 0 ? void 0 : options.metricsTimeout) || (options === null || options === void 0 ? void 0 : options.timeout) || 1e4
    });
  }
  function configureHoneycombHttpJsonLogExporter(options) {
    const apiKey = getLogsApiKey(options);
    return new OTLPLogExporter({
      url: getLogsEndpoint(options),
      headers: configureHeaders(options, apiKey, options === null || options === void 0 ? void 0 : options.logsHeaders),
      timeoutMillis: (options === null || options === void 0 ? void 0 : options.logsTimeout) || (options === null || options === void 0 ? void 0 : options.timeout) || 1e4
    });
  }
  function configureHeaders(options, apiKey, signalHeaders, isMetrics = false) {
    const headers = Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.headers), signalHeaders);
    if (apiKey && !headers[TEAM_HEADER_KEY]) {
      headers[TEAM_HEADER_KEY] = apiKey;
    }
    if (isClassic(apiKey)) {
      if (isMetrics && (options === null || options === void 0 ? void 0 : options.metricsDataset)) {
        headers[DATASET_HEADER_KEY] = options === null || options === void 0 ? void 0 : options.metricsDataset;
      } else if (options === null || options === void 0 ? void 0 : options.dataset) {
        headers[DATASET_HEADER_KEY] = options === null || options === void 0 ? void 0 : options.dataset;
      }
    }
    return headers;
  }
  function configureConsoleTraceLinkExporter(options) {
    const apiKey = getTracesApiKey(options);
    const {
      authRoot,
      uiRoot
    } = getUrlRoots((options === null || options === void 0 ? void 0 : options.tracesEndpoint) || getTracesEndpoint(options));
    return new ConsoleTraceLinkExporter(options === null || options === void 0 ? void 0 : options.serviceName, apiKey, options === null || options === void 0 ? void 0 : options.logLevel, authRoot, uiRoot);
  }
  var getUrlRoots = (endpoint = "") => {
    const url = new URL(endpoint);
    const subdomainRegex = /(api)([.|-])?(.*?)(\.?)(honeycomb\.io)(.*)/;
    const matches = subdomainRegex.exec(url.host);
    if (matches === null) {
      return {
        authRoot: void 0,
        uiRoot: void 0
      };
    }
    const isDashSubdomain = matches[2] === "-";
    let apiSubdomain;
    let uiSubdomain;
    if (isDashSubdomain) {
      apiSubdomain = `api-${matches[3]}`;
      uiSubdomain = `ui-${matches[3]}`;
    } else {
      apiSubdomain = matches[3] ? `api.${matches[3]}` : "api";
      uiSubdomain = matches[3] ? `ui.${matches[3]}` : "ui";
    }
    const authRoot = `${url.protocol}//${apiSubdomain}.honeycomb.io/1/auth`;
    const uiRoot = `${url.protocol}//${uiSubdomain}.honeycomb.io`;
    return {
      authRoot,
      uiRoot
    };
  };
  var ConsoleTraceLinkExporter = class {
    constructor(serviceName, apikey, logLevel, authRoot, uiRoot) {
      this._traceUrl = "";
      this._logLevel = DiagLogLevel.DEBUG;
      if (logLevel) {
        this._logLevel = logLevel;
      }
      if (!serviceName || !apikey) {
        if (this._logLevel >= DiagLogLevel.DEBUG) {
          console.debug(MISSING_FIELDS_FOR_LOCAL_VISUALIZATIONS);
        }
        return;
      }
      if (!authRoot || !uiRoot) {
        if (this._logLevel >= DiagLogLevel.DEBUG) {
          console.debug(MISSING_FIELDS_FOR_GENERATING_LINKS);
        }
        return;
      }
      const options = {
        headers: {
          "x-honeycomb-team": apikey
        }
      };
      fetch(authRoot, options).then((resp) => {
        if (resp.ok) {
          return resp.json();
        }
        throw new Error();
      }).then((data) => {
        var _a, _b, _c;
        const respData = data;
        if ((_a = respData.team) === null || _a === void 0 ? void 0 : _a.slug) {
          this._traceUrl = buildTraceUrl(apikey, serviceName, (_b = respData.team) === null || _b === void 0 ? void 0 : _b.slug, (_c = respData.environment) === null || _c === void 0 ? void 0 : _c.slug, uiRoot);
        } else {
          throw new Error();
        }
      }).catch(() => {
        if (this._logLevel >= DiagLogLevel.INFO) {
          console.log(FAILED_AUTH_FOR_LOCAL_VISUALIZATIONS);
        }
      });
    }
    export(spans, resultCallback) {
      if (this._traceUrl) {
        spans.forEach((span) => {
          var _a;
          if (!((_a = span.parentSpanContext) === null || _a === void 0 ? void 0 : _a.spanId) && this._logLevel >= DiagLogLevel.INFO) {
            console.log(createHoneycombSDKLogMessage(`Honeycomb link: ${this._traceUrl}=${span.spanContext().traceId}`));
          }
        });
      }
      resultCallback({
        code: ExportResultCode.SUCCESS
      });
    }
    shutdown() {
      return Promise.resolve();
    }
  };
  function buildTraceUrl(apikey, serviceName, team, environment, uiRoot) {
    let url = `${uiRoot}/${team}`;
    if (!isClassic(apikey) && environment) {
      url += `/environments/${environment}`;
    }
    url += `/datasets/${serviceName}/trace?trace_id`;
    return url;
  }
  function configureTraceExporters(options) {
    const honeycombTraceExporters = [];
    if (options === null || options === void 0 ? void 0 : options.localVisualizations) {
      honeycombTraceExporters.push(configureConsoleTraceLinkExporter(options));
    }
    if (options === null || options === void 0 ? void 0 : options.traceExporter) {
      honeycombTraceExporters.push(options === null || options === void 0 ? void 0 : options.traceExporter);
    }
    if (options === null || options === void 0 ? void 0 : options.traceExporters) {
      honeycombTraceExporters.push(...options.traceExporters);
    }
    if ((options === null || options === void 0 ? void 0 : options.disableDefaultTraceExporter) !== true) {
      honeycombTraceExporters.unshift(configureHoneycombHttpJsonTraceExporter(options));
    }
    return configureCompositeExporter([...honeycombTraceExporters]);
  }
  function configureMetricExporters(options) {
    const exporters = [];
    exporters.push(configureHoneycombHttpJsonMetricExporter(options));
    if (options === null || options === void 0 ? void 0 : options.localVisualizations) {
      exporters.push(new ConsoleMetricExporter());
    }
    return exporters;
  }
  function configureLogExporters(options) {
    const exporters = [];
    exporters.push(configureHoneycombHttpJsonLogExporter(options));
    if (options === null || options === void 0 ? void 0 : options.localVisualizations) {
      exporters.push(new ConsoleLogRecordExporter());
    }
    return exporters;
  }
  function configureCompositeExporter(exporters) {
    return new CompositeSpanExporter(exporters);
  }
  var CompositeSpanExporter = class {
    constructor(exporters) {
      this._exporters = exporters;
    }
    export(spans, resultCallback) {
      this._exporters.forEach((exporter) => exporter.export(spans, resultCallback));
      resultCallback({
        code: ExportResultCode.SUCCESS
      });
    }
    async shutdown() {
      const results = [];
      this._exporters.forEach((exporter) => results.push(exporter.shutdown()));
      await Promise.all(results);
    }
  };
  var BaggageSpanProcessor = class {
    constructor() {
    }
    onStart(span, parentContext) {
      var _a, _b;
      ((_b = (_a = propagation.getBaggage(parentContext)) === null || _a === void 0 ? void 0 : _a.getAllEntries()) !== null && _b !== void 0 ? _b : []).forEach((entry) => {
        span.setAttribute(entry[0], entry[1].value);
        diag2.debug(`@honeycombio/opentelemetry-web: \u{1F6A8} Baggage in all outgoing headers: ${entry[0]}=${entry[1].value} `);
      });
    }
    onEnd() {
    }
    forceFlush() {
      return Promise.resolve();
    }
    shutdown() {
      return Promise.resolve();
    }
  };
  var BrowserAttributesSpanProcessor = class {
    constructor() {
    }
    onStart(span) {
      const {
        href,
        pathname,
        search,
        hash,
        hostname
      } = window.location;
      span.setAttributes({
        [ATTR_BROWSER_WIDTH]: window.innerWidth,
        [ATTR_BROWSER_HEIGHT]: window.innerHeight,
        [ATTR_PAGE_HASH]: hash,
        [ATTR_PAGE_URL]: href,
        [ATTR_PAGE_ROUTE]: pathname,
        [ATTR_PAGE_HOSTNAME]: hostname,
        [ATTR_PAGE_SEARCH]: search,
        [ATTR_URL_PATH]: pathname
      });
    }
    onEnd() {
    }
    forceFlush() {
      return Promise.resolve();
    }
    shutdown() {
      return Promise.resolve();
    }
  };
  var generator = new RandomIdGenerator();
  var sessionId = generator.generateTraceId();
  var defaultSessionProvider = {
    getSessionId: () => sessionId
  };
  var configureSpanProcessors = (options) => {
    const processors = [];
    if (!(options === null || options === void 0 ? void 0 : options.disableBrowserAttributes)) {
      processors.push(new BrowserAttributesSpanProcessor());
    }
    processors.push(new BaggageSpanProcessor(), createSessionSpanProcessor((options === null || options === void 0 ? void 0 : options.sessionProvider) || defaultSessionProvider), ...(options === null || options === void 0 ? void 0 : options.spanProcessors) || []);
    return processors;
  };
  var ATTR_BROWSER_LANGUAGE = "browser.language";
  var ATTR_BROWSER_MOBILE = "browser.mobile";
  var ATTR_TELEMETRY_DISTRO_NAME = "telemetry.distro.name";
  var ATTR_TELEMETRY_DISTRO_VERSION = "telemetry.distro.version";
  function configureHoneycombResource() {
    return resourceFromAttributes({
      [ATTR_HONEYCOMB_DISTRO_VERSION]: VERSION4,
      [ATTR_HONEYCOMB_DISTRO_RUNTIME_VERSION]: "browser",
      [ATTR_TELEMETRY_DISTRO_NAME]: "@honeycombio/opentelemetry-web",
      [ATTR_TELEMETRY_DISTRO_VERSION]: VERSION4
    });
  }
  var defaultConfig = {
    path: true,
    hash: true,
    hostname: true,
    referrer: true,
    url: false,
    search: false
  };
  function configureEntryPageResource(config) {
    if (config === false || !(window === null || window === void 0 ? void 0 : window.location)) {
      return resourceFromAttributes({});
    }
    const options = getOptions(config);
    const {
      href,
      pathname,
      search,
      hash,
      hostname
    } = window.location;
    const attributes = {
      [ATTR_ENTRY_PAGE_URL]: optionalAttribute(options.url, href),
      [ATTR_ENTRY_PAGE_PATH]: optionalAttribute(options.path, pathname),
      [ATTR_ENTRY_PAGE_SEARCH]: optionalAttribute(options.search, search),
      [ATTR_ENTRY_PAGE_HASH]: optionalAttribute(options.hash, hash),
      [ATTR_ENTRY_PAGE_HOSTNAME]: optionalAttribute(options.hostname, hostname),
      [ATTR_ENTRY_PAGE_REFERRER]: optionalAttribute(options.referrer, document.referrer)
    };
    return resourceFromAttributes(attributes);
  }
  function getOptions(config) {
    if (!config) {
      return defaultConfig;
    }
    return Object.assign(Object.assign({}, defaultConfig), config);
  }
  function optionalAttribute(shouldInclude, attribute) {
    if (!shouldInclude) {
      return void 0;
    }
    return attribute;
  }
  var computeScreenSize = (screenWidth) => {
    if (screenWidth <= 768) return "small";
    else if (screenWidth > 768 && screenWidth <= 1024) return "medium";
    else if (screenWidth > 1024) return "large";
    return "unknown";
  };
  var computeNetworkType = (networkInformation) => {
    var _a;
    return (_a = networkInformation === null || networkInformation === void 0 ? void 0 : networkInformation.effectiveType) !== null && _a !== void 0 ? _a : "unknown";
  };
  var computeDeviceType = (detectedDeviceType, detectedBrowserName) => {
    if (!detectedDeviceType && !detectedBrowserName) {
      return "unknown";
    }
    if (!detectedDeviceType) {
      return "desktop";
    }
    return detectedDeviceType;
  };
  var computeDeviceProperties = (userAgent) => {
    const uaParser = new import_ua_parser_js.default(userAgent);
    const {
      name: browserName,
      version: browserVersion
    } = uaParser.getBrowser();
    return {
      browserName: browserName !== null && browserName !== void 0 ? browserName : "unknown",
      browserVersion: browserVersion !== null && browserVersion !== void 0 ? browserVersion : "unknown",
      deviceType: computeDeviceType(uaParser.getDevice().type, browserName)
    };
  };
  function configureBrowserAttributesResource() {
    const {
      browserName,
      browserVersion,
      deviceType
    } = computeDeviceProperties(navigator.userAgent);
    const browserAttributes = {
      [ATTR_USER_AGENT_ORIGINAL]: navigator.userAgent,
      //https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_tablet_or_desktop
      [ATTR_BROWSER_MOBILE]: navigator.userAgent.includes("Mobi"),
      [ATTR_BROWSER_TOUCH_SCREEN_ENABLED]: navigator.maxTouchPoints > 0,
      [ATTR_BROWSER_LANGUAGE]: navigator.language,
      [ATTR_BROWSER_NAME]: browserName,
      [ATTR_BROWSER_VERSION]: browserVersion,
      [ATTR_DEVICE_TYPE]: deviceType,
      [ATTR_NETWORK_EFFECTIVE_TYPE]: computeNetworkType(navigator.connection),
      [ATTR_SCREEN_WIDTH]: window.screen.width,
      [ATTR_SCREEN_HEIGHT]: window.screen.height,
      [ATTR_SCREEN_SIZE]: computeScreenSize(window.screen.width)
    };
    return resourceFromAttributes(browserAttributes);
  }
  var configureResourceAttributes = (options) => {
    let resource = resourceFromAttributes({});
    if (!(options === null || options === void 0 ? void 0 : options.disableBrowserAttributes)) {
      resource = resource.merge(configureEntryPageResource(options === null || options === void 0 ? void 0 : options.entryPageAttributes)).merge(configureBrowserAttributesResource());
    }
    resource = resource.merge(configureHoneycombResource());
    if (options === null || options === void 0 ? void 0 : options.resource) {
      resource = resource.merge(options.resource);
    }
    if (options === null || options === void 0 ? void 0 : options.resourceAttributes) {
      resource = resource.merge(resourceFromAttributes(options.resourceAttributes));
    }
    return resource;
  };
  var HoneycombWebSDK = class extends WebSDK {
    constructor(options) {
      var _a, _b;
      const instrumentations = [...(options === null || options === void 0 ? void 0 : options.instrumentations) || []];
      if (((_a = options === null || options === void 0 ? void 0 : options.webVitalsInstrumentationConfig) === null || _a === void 0 ? void 0 : _a.enabled) !== false) {
        instrumentations.push(new WebVitalsInstrumentation(options === null || options === void 0 ? void 0 : options.webVitalsInstrumentationConfig));
      }
      if (((_b = options === null || options === void 0 ? void 0 : options.globalErrorsInstrumentationConfig) === null || _b === void 0 ? void 0 : _b.enabled) !== false) {
        instrumentations.push(new GlobalErrorsInstrumentation(options === null || options === void 0 ? void 0 : options.globalErrorsInstrumentationConfig));
      }
      super(Object.assign(Object.assign({}, options), {
        instrumentations,
        resource: configureResourceAttributes(options),
        sampler: configureSampler(options),
        spanProcessors: configureSpanProcessors(options),
        traceExporter: configureTraceExporters(options),
        metricExporters: configureMetricExporters(options),
        logExporters: configureLogExporters(options)
      }));
      validateOptionsWarnings(options);
      if (options === null || options === void 0 ? void 0 : options.debug) {
        configureDebug(options);
      }
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLogger.js
  var NoopLogger3 = class {
    emit(_logRecord) {
    }
  };
  var NOOP_LOGGER3 = new NoopLogger3();

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLoggerProvider.js
  var NoopLoggerProvider3 = class {
    getLogger(_name, _version, _options) {
      return new NoopLogger3();
    }
  };
  var NOOP_LOGGER_PROVIDER3 = new NoopLoggerProvider3();

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLogger.js
  var ProxyLogger3 = class {
    constructor(_provider, name, version, options) {
      this._provider = _provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    /**
     * Emit a log record. This method should only be used by log appenders.
     *
     * @param logRecord
     */
    emit(logRecord) {
      this._getLogger().emit(logRecord);
    }
    /**
     * Try to get a logger from the proxy logger provider.
     * If the proxy logger provider has no delegate, return a noop logger.
     */
    _getLogger() {
      if (this._delegate) {
        return this._delegate;
      }
      const logger3 = this._provider._getDelegateLogger(this.name, this.version, this.options);
      if (!logger3) {
        return NOOP_LOGGER3;
      }
      this._delegate = logger3;
      return this._delegate;
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
  var ProxyLoggerProvider3 = class {
    getLogger(name, version, options) {
      var _a;
      return (_a = this._getDelegateLogger(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger3(this, name, version, options);
    }
    /**
     * Get the delegate logger provider.
     * Used by tests only.
     * @internal
     */
    _getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_LOGGER_PROVIDER3;
    }
    /**
     * Set the delegate logger provider
     * @internal
     */
    _setDelegate(delegate) {
      this._delegate = delegate;
    }
    /**
     * @internal
     */
    _getDelegateLogger(name, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name, version, options);
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/platform/browser/globalThis.js
  var _globalThis6 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/api-logs/build/esm/internal/global-utils.js
  var GLOBAL_LOGS_API_KEY3 = Symbol.for("io.opentelemetry.js.api.logs");
  var _global4 = _globalThis6;
  function makeGetter3(requiredVersion, instance, fallback) {
    return (version) => version === requiredVersion ? instance : fallback;
  }
  var API_BACKWARDS_COMPATIBILITY_VERSION3 = 1;

  // node_modules/@opentelemetry/api-logs/build/esm/api/logs.js
  var LogsAPI3 = class _LogsAPI {
    constructor() {
      this._proxyLoggerProvider = new ProxyLoggerProvider3();
    }
    static getInstance() {
      if (!this._instance) {
        this._instance = new _LogsAPI();
      }
      return this._instance;
    }
    setGlobalLoggerProvider(provider) {
      if (_global4[GLOBAL_LOGS_API_KEY3]) {
        return this.getLoggerProvider();
      }
      _global4[GLOBAL_LOGS_API_KEY3] = makeGetter3(API_BACKWARDS_COMPATIBILITY_VERSION3, provider, NOOP_LOGGER_PROVIDER3);
      this._proxyLoggerProvider._setDelegate(provider);
      return provider;
    }
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    getLoggerProvider() {
      var _a, _b;
      return (_b = (_a = _global4[GLOBAL_LOGS_API_KEY3]) === null || _a === void 0 ? void 0 : _a.call(_global4, API_BACKWARDS_COMPATIBILITY_VERSION3)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
    }
    /**
     * Returns a logger from the global logger provider.
     *
     * @returns Logger
     */
    getLogger(name, version, options) {
      return this.getLoggerProvider().getLogger(name, version, options);
    }
    /** Remove the global logger provider */
    disable() {
      delete _global4[GLOBAL_LOGS_API_KEY3];
      this._proxyLoggerProvider = new ProxyLoggerProvider3();
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/index.js
  var logs3 = LogsAPI3.getInstance();

  // node_modules/@opentelemetry/instrumentation/build/esm/shimmer.js
  var logger2 = console.error.bind(console);
  function defineProperty2(obj, name, value) {
    const enumerable = !!obj[name] && Object.prototype.propertyIsEnumerable.call(obj, name);
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable,
      writable: true,
      value
    });
  }
  var wrap3 = (nodule, name, wrapper) => {
    if (!nodule || !nodule[name]) {
      logger2("no original function " + String(name) + " to wrap");
      return;
    }
    if (!wrapper) {
      logger2("no wrapper function");
      logger2(new Error().stack);
      return;
    }
    const original = nodule[name];
    if (typeof original !== "function" || typeof wrapper !== "function") {
      logger2("original object and wrapper must be functions");
      return;
    }
    const wrapped = wrapper(original, name);
    defineProperty2(wrapped, "__original", original);
    defineProperty2(wrapped, "__unwrap", () => {
      if (nodule[name] === wrapped) {
        defineProperty2(nodule, name, original);
      }
    });
    defineProperty2(wrapped, "__wrapped", true);
    defineProperty2(nodule, name, wrapped);
    return wrapped;
  };
  var massWrap3 = (nodules, names, wrapper) => {
    if (!nodules) {
      logger2("must provide one or more modules to patch");
      logger2(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger2("must provide one or more functions to wrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        wrap3(nodule, name, wrapper);
      });
    });
  };
  var unwrap3 = (nodule, name) => {
    if (!nodule || !nodule[name]) {
      logger2("no function to unwrap.");
      logger2(new Error().stack);
      return;
    }
    const wrapped = nodule[name];
    if (!wrapped.__unwrap) {
      logger2("no original to unwrap to -- has " + String(name) + " already been unwrapped?");
    } else {
      wrapped.__unwrap();
      return;
    }
  };
  var massUnwrap3 = (nodules, names) => {
    if (!nodules) {
      logger2("must provide one or more modules to patch");
      logger2(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger2("must provide one or more functions to unwrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        unwrap3(nodule, name);
      });
    });
  };
  function shimmer3(options) {
    if (options && options.logger) {
      if (typeof options.logger !== "function") {
        logger2("new logger isn't a function, not replacing");
      } else {
        logger2 = options.logger;
      }
    }
  }
  shimmer3.wrap = wrap3;
  shimmer3.massWrap = massWrap3;
  shimmer3.unwrap = unwrap3;
  shimmer3.massUnwrap = massUnwrap3;

  // node_modules/@opentelemetry/instrumentation/build/esm/instrumentation.js
  var InstrumentationAbstract3 = class {
    instrumentationName;
    instrumentationVersion;
    _config = {};
    _tracer;
    _meter;
    _logger;
    _diag;
    constructor(instrumentationName, instrumentationVersion, config) {
      this.instrumentationName = instrumentationName;
      this.instrumentationVersion = instrumentationVersion;
      this.setConfig(config);
      this._diag = diag2.createComponentLogger({
        namespace: instrumentationName
      });
      this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
      this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
      this._logger = logs3.getLogger(instrumentationName, instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Api to wrap instrumented method */
    _wrap = wrap3;
    /* Api to unwrap instrumented methods */
    _unwrap = unwrap3;
    /* Api to mass wrap instrumented method */
    _massWrap = massWrap3;
    /* Api to mass unwrap instrumented methods */
    _massUnwrap = massUnwrap3;
    /* Returns meter */
    get meter() {
      return this._meter;
    }
    /**
     * Sets MeterProvider to this plugin
     * @param meterProvider
     */
    setMeterProvider(meterProvider) {
      this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Returns logger */
    get logger() {
      return this._logger;
    }
    /**
     * Sets LoggerProvider to this plugin
     * @param loggerProvider
     */
    setLoggerProvider(loggerProvider) {
      this._logger = loggerProvider.getLogger(this.instrumentationName, this.instrumentationVersion);
    }
    /**
     * @experimental
     *
     * Get module definitions defined by {@link init}.
     * This can be used for experimental compile-time instrumentation.
     *
     * @returns an array of {@link InstrumentationModuleDefinition}
     */
    getModuleDefinitions() {
      const initResult = this.init() ?? [];
      if (!Array.isArray(initResult)) {
        return [initResult];
      }
      return initResult;
    }
    /**
     * Sets the new metric instruments with the current Meter.
     */
    _updateMetricInstruments() {
      return;
    }
    /* Returns InstrumentationConfig */
    getConfig() {
      return this._config;
    }
    /**
     * Sets InstrumentationConfig to this plugin
     * @param config
     */
    setConfig(config) {
      this._config = {
        enabled: true,
        ...config
      };
    }
    /**
     * Sets TraceProvider to this plugin
     * @param tracerProvider
     */
    setTracerProvider(tracerProvider) {
      this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    }
    /* Returns tracer */
    get tracer() {
      return this._tracer;
    }
    /**
     * Execute span customization hook, if configured, and log any errors.
     * Any semantics of the trigger and info are defined by the specific instrumentation.
     * @param hookHandler The optional hook handler which the user has configured via instrumentation config
     * @param triggerName The name of the trigger for executing the hook for logging purposes
     * @param span The span to which the hook should be applied
     * @param info The info object to be passed to the hook, with useful data the hook may use
     */
    _runSpanCustomizationHook(hookHandler, triggerName, span, info) {
      if (!hookHandler) {
        return;
      }
      try {
        hookHandler(span, info);
      } catch (e2) {
        this._diag.error(`Error running span customization hook due to exception in handler`, { triggerName }, e2);
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation/build/esm/platform/browser/instrumentation.js
  var InstrumentationBase2 = class extends InstrumentationAbstract3 {
    constructor(instrumentationName, instrumentationVersion, config) {
      super(instrumentationName, instrumentationVersion, config);
      if (this._config.enabled) {
        this.enable();
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation/build/esm/utils.js
  function safeExecuteInTheMiddle(execute, onFinish, preventThrowingError) {
    let error;
    let result;
    try {
      result = execute();
    } catch (e2) {
      error = e2;
    } finally {
      onFinish(error, result);
      if (error && !preventThrowingError) {
        throw error;
      }
      return result;
    }
  }
  function isWrapped(func) {
    return typeof func === "function" && typeof func.__original === "function" && typeof func.__unwrap === "function" && func.__wrapped === true;
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/semconvStability.js
  var SemconvStability;
  (function(SemconvStability2) {
    SemconvStability2[SemconvStability2["STABLE"] = 1] = "STABLE";
    SemconvStability2[SemconvStability2["OLD"] = 2] = "OLD";
    SemconvStability2[SemconvStability2["DUPLICATE"] = 3] = "DUPLICATE";
  })(SemconvStability || (SemconvStability = {}));
  function semconvStabilityFromStr(namespace, str) {
    let semconvStability = SemconvStability.OLD;
    const entries = str?.split(",").map((v2) => v2.trim()).filter((s2) => s2 !== "");
    for (const entry of entries ?? []) {
      if (entry.toLowerCase() === namespace + "/dup") {
        semconvStability = SemconvStability.DUPLICATE;
        break;
      } else if (entry.toLowerCase() === namespace) {
        semconvStability = SemconvStability.STABLE;
      }
    }
    return semconvStability;
  }

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/AttributeNames.js
  var AttributeNames;
  (function(AttributeNames5) {
    AttributeNames5["DOCUMENT_LOAD"] = "documentLoad";
    AttributeNames5["DOCUMENT_FETCH"] = "documentFetch";
    AttributeNames5["RESOURCE_FETCH"] = "resourceFetch";
  })(AttributeNames || (AttributeNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/version.js
  var PACKAGE_VERSION = "0.50.0";
  var PACKAGE_NAME = "@opentelemetry/instrumentation-document-load";

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/EventNames.js
  var EventNames;
  (function(EventNames3) {
    EventNames3["FIRST_PAINT"] = "firstPaint";
    EventNames3["FIRST_CONTENTFUL_PAINT"] = "firstContentfulPaint";
  })(EventNames || (EventNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/utils.js
  var getPerformanceNavigationEntries = () => {
    const entries = {};
    const performanceNavigationTiming = otperformance.getEntriesByType?.("navigation")[0];
    if (performanceNavigationTiming) {
      const keys = Object.values(PerformanceTimingNames);
      keys.forEach((key) => {
        if (hasKey(performanceNavigationTiming, key)) {
          const value = performanceNavigationTiming[key];
          if (typeof value === "number") {
            entries[key] = value;
          }
        }
      });
    } else {
      const perf = otperformance;
      const performanceTiming = perf.timing;
      if (performanceTiming) {
        const keys = Object.values(PerformanceTimingNames);
        keys.forEach((key) => {
          if (hasKey(performanceTiming, key)) {
            const value = performanceTiming[key];
            if (typeof value === "number") {
              entries[key] = value;
            }
          }
        });
      }
    }
    return entries;
  };
  var performancePaintNames = {
    "first-paint": EventNames.FIRST_PAINT,
    "first-contentful-paint": EventNames.FIRST_CONTENTFUL_PAINT
  };
  var addSpanPerformancePaintEvents = (span) => {
    const performancePaintTiming = otperformance.getEntriesByType?.("paint");
    if (performancePaintTiming) {
      performancePaintTiming.forEach(({ name, startTime }) => {
        if (hasKey(performancePaintNames, name)) {
          span.addEvent(performancePaintNames[name], startTime);
        }
      });
    }
  };

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/instrumentation.js
  var DocumentLoadInstrumentation = class extends InstrumentationBase2 {
    component = "document-load";
    version = "1";
    moduleName = this.component;
    constructor(config = {}) {
      super(PACKAGE_NAME, PACKAGE_VERSION, config);
    }
    init() {
    }
    /**
     * callback to be executed when page is loaded
     */
    _onDocumentLoaded() {
      window.setTimeout(() => {
        this._collectPerformance();
      });
    }
    /**
     * Adds spans for all resources
     * @param rootSpan
     */
    _addResourcesSpans(rootSpan) {
      const resources = otperformance.getEntriesByType?.("resource");
      if (resources) {
        resources.forEach((resource) => {
          this._initResourceSpan(resource, rootSpan);
        });
      }
    }
    /**
     * Collects information about performance and creates appropriate spans
     */
    _collectPerformance() {
      const metaElement = Array.from(document.getElementsByTagName("meta")).find((e2) => e2.getAttribute("name") === TRACE_PARENT_HEADER);
      const entries = getPerformanceNavigationEntries();
      const traceparent = metaElement && metaElement.content || "";
      context.with(propagation.extract(ROOT_CONTEXT, { traceparent }), () => {
        const rootSpan = this._startSpan(AttributeNames.DOCUMENT_LOAD, PerformanceTimingNames.FETCH_START, entries);
        if (!rootSpan) {
          return;
        }
        context.with(trace.setSpan(context.active(), rootSpan), () => {
          const fetchSpan = this._startSpan(AttributeNames.DOCUMENT_FETCH, PerformanceTimingNames.FETCH_START, entries);
          if (fetchSpan) {
            fetchSpan.setAttribute(SEMATTRS_HTTP_URL, location.href);
            context.with(trace.setSpan(context.active(), fetchSpan), () => {
              addSpanNetworkEvents(fetchSpan, entries, this.getConfig().ignoreNetworkEvents);
              this._addCustomAttributesOnSpan(fetchSpan, this.getConfig().applyCustomAttributesOnSpan?.documentFetch);
              this._endSpan(fetchSpan, PerformanceTimingNames.RESPONSE_END, entries);
            });
          }
        });
        rootSpan.setAttribute(SEMATTRS_HTTP_URL, location.href);
        rootSpan.setAttribute(SEMATTRS_HTTP_USER_AGENT, navigator.userAgent);
        this._addResourcesSpans(rootSpan);
        if (!this.getConfig().ignoreNetworkEvents) {
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.FETCH_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.UNLOAD_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.UNLOAD_EVENT_END, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_INTERACTIVE, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_CONTENT_LOADED_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_CONTENT_LOADED_EVENT_END, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_COMPLETE, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.LOAD_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.LOAD_EVENT_END, entries);
        }
        if (!this.getConfig().ignorePerformancePaintEvents) {
          addSpanPerformancePaintEvents(rootSpan);
        }
        this._addCustomAttributesOnSpan(rootSpan, this.getConfig().applyCustomAttributesOnSpan?.documentLoad);
        this._endSpan(rootSpan, PerformanceTimingNames.LOAD_EVENT_END, entries);
      });
    }
    /**
     * Helper function for ending span
     * @param span
     * @param performanceName name of performance entry for time end
     * @param entries
     */
    _endSpan(span, performanceName, entries) {
      if (span) {
        if (hasKey(entries, performanceName)) {
          span.end(entries[performanceName]);
        } else {
          span.end();
        }
      }
    }
    /**
     * Creates and ends a span with network information about resource added as timed events
     * @param resource
     * @param parentSpan
     */
    _initResourceSpan(resource, parentSpan) {
      const span = this._startSpan(AttributeNames.RESOURCE_FETCH, PerformanceTimingNames.FETCH_START, resource, parentSpan);
      if (span) {
        span.setAttribute(SEMATTRS_HTTP_URL, resource.name);
        addSpanNetworkEvents(span, resource, this.getConfig().ignoreNetworkEvents);
        this._addCustomAttributesOnResourceSpan(span, resource, this.getConfig().applyCustomAttributesOnSpan?.resourceFetch);
        this._endSpan(span, PerformanceTimingNames.RESPONSE_END, resource);
      }
    }
    /**
     * Helper function for starting a span
     * @param spanName name of span
     * @param performanceName name of performance entry for time start
     * @param entries
     * @param parentSpan
     */
    _startSpan(spanName, performanceName, entries, parentSpan) {
      if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number") {
        const span = this.tracer.startSpan(spanName, {
          startTime: entries[performanceName]
        }, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
        return span;
      }
      return void 0;
    }
    /**
     * executes callback {_onDocumentLoaded} when the page is loaded
     */
    _waitForPageLoad() {
      if (window.document.readyState === "complete") {
        this._onDocumentLoaded();
      } else {
        this._onDocumentLoaded = this._onDocumentLoaded.bind(this);
        window.addEventListener("load", this._onDocumentLoaded);
      }
    }
    /**
     * adds custom attributes to root span if configured
     */
    _addCustomAttributesOnSpan(span, applyCustomAttributesOnSpan) {
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("addCustomAttributesOnSpan", error);
        }, true);
      }
    }
    /**
     * adds custom attributes to span if configured
     */
    _addCustomAttributesOnResourceSpan(span, resource, applyCustomAttributesOnSpan) {
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, resource), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("addCustomAttributesOnResourceSpan", error);
        }, true);
      }
    }
    /**
     * implements enable function
     */
    enable() {
      window.removeEventListener("load", this._onDocumentLoaded);
      this._waitForPageLoad();
    }
    /**
     * implements disable function
     */
    disable() {
      window.removeEventListener("load", this._onDocumentLoaded);
    }
  };

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/enums/AttributeNames.js
  var AttributeNames2;
  (function(AttributeNames5) {
    AttributeNames5["COMPONENT"] = "component";
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames2 || (AttributeNames2 = {}));

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/semconv.js
  var ATTR_HTTP_HOST = "http.host";
  var ATTR_HTTP_METHOD = "http.method";
  var ATTR_HTTP_REQUEST_BODY_SIZE = "http.request.body.size";
  var ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = "http.request_content_length_uncompressed";
  var ATTR_HTTP_SCHEME = "http.scheme";
  var ATTR_HTTP_STATUS_CODE = "http.status_code";
  var ATTR_HTTP_URL = "http.url";
  var ATTR_HTTP_USER_AGENT = "http.user_agent";

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/utils.js
  var DIAG_LOGGER = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-fetch/utils"
  });
  function getFetchBodyLength(...args) {
    if (args[0] instanceof URL || typeof args[0] === "string") {
      const requestInit = args[1];
      if (!requestInit?.body) {
        return Promise.resolve();
      }
      if (requestInit.body instanceof ReadableStream) {
        const { body, length } = _getBodyNonDestructively(requestInit.body);
        requestInit.body = body;
        return length;
      } else {
        return Promise.resolve(getXHRBodyLength(requestInit.body));
      }
    } else {
      const info = args[0];
      if (!info?.body) {
        return Promise.resolve();
      }
      return info.clone().text().then((t2) => getByteLength(t2));
    }
  }
  function _getBodyNonDestructively(body) {
    if (!body.pipeThrough) {
      DIAG_LOGGER.warn("Platform has ReadableStream but not pipeThrough!");
      return {
        body,
        length: Promise.resolve(void 0)
      };
    }
    let length = 0;
    let resolveLength;
    const lengthPromise = new Promise((resolve) => {
      resolveLength = resolve;
    });
    const transform = new TransformStream({
      start() {
      },
      async transform(chunk, controller) {
        const bytearray = await chunk;
        length += bytearray.byteLength;
        controller.enqueue(chunk);
      },
      flush() {
        resolveLength(length);
      }
    });
    return {
      body: body.pipeThrough(transform),
      length: lengthPromise
    };
  }
  function isDocument(value) {
    return typeof Document !== "undefined" && value instanceof Document;
  }
  function getXHRBodyLength(body) {
    if (isDocument(body)) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (typeof body === "string") {
      return getByteLength(body);
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body instanceof FormData) {
      return getFormDataSize(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength(body.toString());
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    DIAG_LOGGER.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER = new TextEncoder();
  function getByteLength(s2) {
    return TEXT_ENCODER.encode(s2).byteLength;
  }
  function getFormDataSize(formData) {
    let size = 0;
    for (const [key, value] of formData.entries()) {
      size += key.length;
      if (value instanceof Blob) {
        size += value.size;
      } else {
        size += value.length;
      }
    }
    return size;
  }
  function normalizeHttpRequestMethod(method) {
    const knownMethods3 = getKnownMethods();
    const methUpper = method.toUpperCase();
    if (methUpper in knownMethods3) {
      return methUpper;
    } else {
      return "_OTHER";
    }
  }
  var DEFAULT_KNOWN_METHODS = {
    CONNECT: true,
    DELETE: true,
    GET: true,
    HEAD: true,
    OPTIONS: true,
    PATCH: true,
    POST: true,
    PUT: true,
    TRACE: true
  };
  var knownMethods;
  function getKnownMethods() {
    if (knownMethods === void 0) {
      const cfgMethods = getStringListFromEnv("OTEL_INSTRUMENTATION_HTTP_KNOWN_METHODS");
      if (cfgMethods && cfgMethods.length > 0) {
        knownMethods = {};
        cfgMethods.forEach((m2) => {
          knownMethods[m2] = true;
        });
      } else {
        knownMethods = DEFAULT_KNOWN_METHODS;
      }
    }
    return knownMethods;
  }
  var HTTP_PORT_FROM_PROTOCOL = {
    "https:": "443",
    "http:": "80"
  };
  function serverPortFromUrl(url) {
    const serverPort = Number(url.port || HTTP_PORT_FROM_PROTOCOL[url.protocol]);
    if (serverPort && !isNaN(serverPort)) {
      return serverPort;
    } else {
      return void 0;
    }
  }

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/version.js
  var VERSION5 = "0.205.0";

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/fetch.js
  var OBSERVER_WAIT_TIME_MS = 300;
  var isNode = typeof process === "object" && process.release?.name === "node";
  var FetchInstrumentation = class extends InstrumentationBase2 {
    component = "fetch";
    version = VERSION5;
    moduleName = this.component;
    _usedResources = /* @__PURE__ */ new WeakSet();
    _tasksCount = 0;
    _semconvStability;
    constructor(config = {}) {
      super("@opentelemetry/instrumentation-fetch", VERSION5, config);
      this._semconvStability = semconvStabilityFromStr("http", config?.semconvStabilityOptIn);
    }
    init() {
    }
    /**
     * Add cors pre flight child span
     * @param span
     * @param corsPreFlightRequest
     */
    _addChildSpan(span, corsPreFlightRequest) {
      const childSpan = this.tracer.startSpan("CORS Preflight", {
        startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
      }, trace.setSpan(context.active(), span));
      const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
      addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
    }
    /**
     * Adds more attributes to span just before ending it
     * @param span
     * @param response
     */
    _addFinalSpanAttributes(span, response) {
      const parsedUrl = parseUrl(response.url);
      if (this._semconvStability & SemconvStability.OLD) {
        span.setAttribute(ATTR_HTTP_STATUS_CODE, response.status);
        if (response.statusText != null) {
          span.setAttribute(AttributeNames2.HTTP_STATUS_TEXT, response.statusText);
        }
        span.setAttribute(ATTR_HTTP_HOST, parsedUrl.host);
        span.setAttribute(ATTR_HTTP_SCHEME, parsedUrl.protocol.replace(":", ""));
        if (typeof navigator !== "undefined") {
          span.setAttribute(ATTR_HTTP_USER_AGENT, navigator.userAgent);
        }
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
        span.setAttribute(ATTR_SERVER_ADDRESS, parsedUrl.hostname);
        const serverPort = serverPortFromUrl(parsedUrl);
        if (serverPort) {
          span.setAttribute(ATTR_SERVER_PORT, serverPort);
        }
      }
    }
    /**
     * Add headers
     * @param options
     * @param spanUrl
     */
    _addHeaders(options, spanUrl) {
      if (!shouldPropagateTraceHeaders(spanUrl, this.getConfig().propagateTraceHeaderCorsUrls)) {
        const headers = {};
        propagation.inject(context.active(), headers);
        if (Object.keys(headers).length > 0) {
          this._diag.debug("headers inject skipped due to CORS policy");
        }
        return;
      }
      if (options instanceof Request) {
        propagation.inject(context.active(), options.headers, {
          set: (h2, k2, v2) => h2.set(k2, typeof v2 === "string" ? v2 : String(v2))
        });
      } else if (options.headers instanceof Headers) {
        propagation.inject(context.active(), options.headers, {
          set: (h2, k2, v2) => h2.set(k2, typeof v2 === "string" ? v2 : String(v2))
        });
      } else if (options.headers instanceof Map) {
        propagation.inject(context.active(), options.headers, {
          set: (h2, k2, v2) => h2.set(k2, typeof v2 === "string" ? v2 : String(v2))
        });
      } else {
        const headers = {};
        propagation.inject(context.active(), headers);
        options.headers = Object.assign({}, headers, options.headers || {});
      }
    }
    /**
     * Clears the resource timings and all resources assigned with spans
     *     when {@link FetchPluginConfig.clearTimingResources} is
     *     set to true (default false)
     * @private
     */
    _clearResources() {
      if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
        performance.clearResourceTimings();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      }
    }
    /**
     * Creates a new span
     * @param url
     * @param options
     */
    _createSpan(url, options = {}) {
      if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
        this._diag.debug("ignoring span as url matches ignored url");
        return;
      }
      let name = "";
      const attributes = {};
      if (this._semconvStability & SemconvStability.OLD) {
        const method = (options.method || "GET").toUpperCase();
        name = `HTTP ${method}`;
        attributes[AttributeNames2.COMPONENT] = this.moduleName;
        attributes[ATTR_HTTP_METHOD] = method;
        attributes[ATTR_HTTP_URL] = url;
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        const origMethod = options.method;
        const normMethod = normalizeHttpRequestMethod(options.method || "GET");
        if (!name) {
          name = normMethod;
        }
        attributes[ATTR_HTTP_REQUEST_METHOD] = normMethod;
        if (normMethod !== origMethod) {
          attributes[ATTR_HTTP_REQUEST_METHOD_ORIGINAL] = origMethod;
        }
        attributes[ATTR_URL_FULL] = url;
      }
      return this.tracer.startSpan(name, {
        kind: SpanKind.CLIENT,
        attributes
      });
    }
    /**
     * Finds appropriate resource and add network events to the span
     * @param span
     * @param resourcesObserver
     * @param endTime
     */
    _findResourceAndAddNetworkEvents(span, resourcesObserver, endTime) {
      let resources = resourcesObserver.entries;
      if (!resources.length) {
        if (!performance.getEntriesByType) {
          return;
        }
        resources = performance.getEntriesByType("resource");
      }
      const resource = getResource(resourcesObserver.spanUrl, resourcesObserver.startTime, endTime, resources, this._usedResources, "fetch");
      if (resource.mainRequest) {
        const mainRequest = resource.mainRequest;
        this._markResourceAsUsed(mainRequest);
        const corsPreFlightRequest = resource.corsPreFlightRequest;
        if (corsPreFlightRequest) {
          this._addChildSpan(span, corsPreFlightRequest);
          this._markResourceAsUsed(corsPreFlightRequest);
        }
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      }
    }
    /**
     * Marks certain [resource]{@link PerformanceResourceTiming} when information
     * from this is used to add events to span.
     * This is done to avoid reusing the same resource again for next span
     * @param resource
     */
    _markResourceAsUsed(resource) {
      this._usedResources.add(resource);
    }
    /**
     * Finish span, add attributes, network events etc.
     * @param span
     * @param spanData
     * @param response
     */
    _endSpan(span, spanData, response) {
      const endTime = millisToHrTime(Date.now());
      const performanceEndTime = hrTime();
      this._addFinalSpanAttributes(span, response);
      if (this._semconvStability & SemconvStability.STABLE) {
        if (response.status >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.setAttribute(ATTR_ERROR_TYPE, String(response.status));
        }
      }
      setTimeout(() => {
        spanData.observer?.disconnect();
        this._findResourceAndAddNetworkEvents(span, spanData, performanceEndTime);
        this._tasksCount--;
        this._clearResources();
        span.end(endTime);
      }, OBSERVER_WAIT_TIME_MS);
    }
    /**
     * Patches the constructor of fetch
     */
    _patchConstructor() {
      return (original) => {
        const plugin = this;
        return function patchConstructor(...args) {
          const self2 = this;
          const url = parseUrl(args[0] instanceof Request ? args[0].url : String(args[0])).href;
          const options = args[0] instanceof Request ? args[0] : args[1] || {};
          const createdSpan = plugin._createSpan(url, options);
          if (!createdSpan) {
            return original.apply(this, args);
          }
          const spanData = plugin._prepareSpanData(url);
          if (plugin.getConfig().measureRequestSize) {
            getFetchBodyLength(...args).then((bodyLength) => {
              if (!bodyLength)
                return;
              if (plugin._semconvStability & SemconvStability.OLD) {
                createdSpan.setAttribute(ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED, bodyLength);
              }
              if (plugin._semconvStability & SemconvStability.STABLE) {
                createdSpan.setAttribute(ATTR_HTTP_REQUEST_BODY_SIZE, bodyLength);
              }
            }).catch((error) => {
              plugin._diag.warn("getFetchBodyLength", error);
            });
          }
          function endSpanOnError(span, error) {
            plugin._applyAttributesAfterFetch(span, options, error);
            plugin._endSpan(span, spanData, {
              status: error.status || 0,
              statusText: error.message,
              url
            });
          }
          function endSpanOnSuccess(span, response) {
            plugin._applyAttributesAfterFetch(span, options, response);
            if (response.status >= 200 && response.status < 400) {
              plugin._endSpan(span, spanData, response);
            } else {
              plugin._endSpan(span, spanData, {
                status: response.status,
                statusText: response.statusText,
                url
              });
            }
          }
          function onSuccess(span, resolve, response) {
            try {
              const resClone = response.clone();
              const body = resClone.body;
              if (body) {
                const reader = body.getReader();
                const read = () => {
                  reader.read().then(({ done }) => {
                    if (done) {
                      endSpanOnSuccess(span, response);
                    } else {
                      read();
                    }
                  }, (error) => {
                    endSpanOnError(span, error);
                  });
                };
                read();
              } else {
                endSpanOnSuccess(span, response);
              }
            } finally {
              resolve(response);
            }
          }
          function onError(span, reject, error) {
            try {
              endSpanOnError(span, error);
            } finally {
              reject(error);
            }
          }
          return new Promise((resolve, reject) => {
            return context.with(trace.setSpan(context.active(), createdSpan), () => {
              plugin._addHeaders(options, url);
              plugin._callRequestHook(createdSpan, options);
              plugin._tasksCount++;
              return original.apply(self2, options instanceof Request ? [options] : [url, options]).then(onSuccess.bind(self2, createdSpan, resolve), onError.bind(self2, createdSpan, reject));
            });
          });
        };
      };
    }
    _applyAttributesAfterFetch(span, request, result) {
      const applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, request, result), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("applyCustomAttributesOnSpan", error);
        }, true);
      }
    }
    _callRequestHook(span, request) {
      const requestHook = this.getConfig().requestHook;
      if (requestHook) {
        safeExecuteInTheMiddle(() => requestHook(span, request), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("requestHook", error);
        }, true);
      }
    }
    /**
     * Prepares a span data - needed later for matching appropriate network
     *     resources
     * @param spanUrl
     */
    _prepareSpanData(spanUrl) {
      const startTime = hrTime();
      const entries = [];
      if (typeof PerformanceObserver !== "function") {
        return { entries, startTime, spanUrl };
      }
      const observer = new PerformanceObserver((list) => {
        const perfObsEntries = list.getEntries();
        perfObsEntries.forEach((entry) => {
          if (entry.initiatorType === "fetch" && entry.name === spanUrl) {
            entries.push(entry);
          }
        });
      });
      observer.observe({
        entryTypes: ["resource"]
      });
      return { entries, observer, startTime, spanUrl };
    }
    /**
     * implements enable function
     */
    enable() {
      if (isNode) {
        this._diag.warn("this instrumentation is intended for web usage only, it does not instrument Node.js's fetch()");
        return;
      }
      if (isWrapped(fetch)) {
        this._unwrap(_globalThis3, "fetch");
        this._diag.debug("removing previous patch for constructor");
      }
      this._wrap(_globalThis3, "fetch", this._patchConstructor());
    }
    /**
     * implements unpatch function
     */
    disable() {
      if (isNode) {
        return;
      }
      this._unwrap(_globalThis3, "fetch");
      this._usedResources = /* @__PURE__ */ new WeakSet();
    }
  };

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/enums/AttributeNames.js
  var AttributeNames3;
  (function(AttributeNames5) {
    AttributeNames5["EVENT_TYPE"] = "event_type";
    AttributeNames5["TARGET_ELEMENT"] = "target_element";
    AttributeNames5["TARGET_XPATH"] = "target_xpath";
    AttributeNames5["HTTP_URL"] = "http.url";
  })(AttributeNames3 || (AttributeNames3 = {}));

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/version.js
  var PACKAGE_VERSION2 = "0.50.0";
  var PACKAGE_NAME2 = "@opentelemetry/instrumentation-user-interaction";

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/instrumentation.js
  var ZONE_CONTEXT_KEY = "OT_ZONE_CONTEXT";
  var EVENT_NAVIGATION_NAME = "Navigation:";
  var DEFAULT_EVENT_NAMES2 = ["click"];
  function defaultShouldPreventSpanCreation() {
    return false;
  }
  var UserInteractionInstrumentation2 = class extends InstrumentationBase2 {
    version = PACKAGE_VERSION2;
    moduleName = "user-interaction";
    _spansData = /* @__PURE__ */ new WeakMap();
    // for addEventListener/removeEventListener state
    _wrappedListeners = /* @__PURE__ */ new WeakMap();
    // for event bubbling
    _eventsSpanMap = /* @__PURE__ */ new WeakMap();
    _eventNames;
    _shouldPreventSpanCreation;
    constructor(config = {}) {
      super(PACKAGE_NAME2, PACKAGE_VERSION2, config);
      this._eventNames = new Set(config?.eventNames ?? DEFAULT_EVENT_NAMES2);
      this._shouldPreventSpanCreation = typeof config?.shouldPreventSpanCreation === "function" ? config.shouldPreventSpanCreation : defaultShouldPreventSpanCreation;
    }
    init() {
    }
    /**
     * This will check if last task was timeout and will save the time to
     * fix the user interaction when nothing happens
     * This timeout comes from xhr plugin which is needed to collect information
     * about last xhr main request from observer
     * @param task
     * @param span
     */
    _checkForTimeout(task, span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        if (task.source === "setTimeout") {
          spanData.hrTimeLastTimeout = hrTime();
        } else if (task.source !== "Promise.then" && task.source !== "setTimeout") {
          spanData.hrTimeLastTimeout = void 0;
        }
      }
    }
    /**
     * Controls whether or not to create a span, based on the event type.
     */
    _allowEventName(eventName) {
      return this._eventNames.has(eventName);
    }
    /**
     * Creates a new span
     * @param element
     * @param eventName
     * @param parentSpan
     */
    _createSpan(element, eventName, parentSpan) {
      if (!(element instanceof HTMLElement)) {
        return void 0;
      }
      if (!element.getAttribute) {
        return void 0;
      }
      if (element.hasAttribute("disabled")) {
        return void 0;
      }
      if (!this._allowEventName(eventName)) {
        return void 0;
      }
      const xpath = getElementXPath(element, true);
      try {
        const span = this.tracer.startSpan(eventName, {
          attributes: {
            [AttributeNames3.EVENT_TYPE]: eventName,
            [AttributeNames3.TARGET_ELEMENT]: element.tagName,
            [AttributeNames3.TARGET_XPATH]: xpath,
            [AttributeNames3.HTTP_URL]: window.location.href
          }
        }, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
        if (this._shouldPreventSpanCreation(eventName, element, span) === true) {
          return void 0;
        }
        this._spansData.set(span, {
          taskCount: 0
        });
        return span;
      } catch (e2) {
        this._diag.error("failed to start create new user interaction span", e2);
      }
      return void 0;
    }
    /**
     * Decrement number of tasks that left in zone,
     * This is needed to be able to end span when no more tasks left
     * @param span
     */
    _decrementTask(span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        spanData.taskCount--;
        if (spanData.taskCount === 0) {
          this._tryToEndSpan(span, spanData.hrTimeLastTimeout);
        }
      }
    }
    /**
     * Return the current span
     * @param zone
     * @private
     */
    _getCurrentSpan(zone) {
      const context2 = zone.get(ZONE_CONTEXT_KEY);
      if (context2) {
        return trace.getSpan(context2);
      }
      return context2;
    }
    /**
     * Increment number of tasks that are run within the same zone.
     *     This is needed to be able to end span when no more tasks left
     * @param span
     */
    _incrementTask(span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        spanData.taskCount++;
      }
    }
    /**
     * Returns true iff we should use the patched callback; false if it's already been patched
     */
    addPatchedListener(on, type, listener, wrappedListener) {
      let listener2Type = this._wrappedListeners.get(listener);
      if (!listener2Type) {
        listener2Type = /* @__PURE__ */ new Map();
        this._wrappedListeners.set(listener, listener2Type);
      }
      let element2patched = listener2Type.get(type);
      if (!element2patched) {
        element2patched = /* @__PURE__ */ new Map();
        listener2Type.set(type, element2patched);
      }
      if (element2patched.has(on)) {
        return false;
      }
      element2patched.set(on, wrappedListener);
      return true;
    }
    /**
     * Returns the patched version of the callback (or undefined)
     */
    removePatchedListener(on, type, listener) {
      const listener2Type = this._wrappedListeners.get(listener);
      if (!listener2Type) {
        return void 0;
      }
      const element2patched = listener2Type.get(type);
      if (!element2patched) {
        return void 0;
      }
      const patched = element2patched.get(on);
      if (patched) {
        element2patched.delete(on);
        if (element2patched.size === 0) {
          listener2Type.delete(type);
          if (listener2Type.size === 0) {
            this._wrappedListeners.delete(listener);
          }
        }
      }
      return patched;
    }
    // utility method to deal with the Function|EventListener nature of addEventListener
    _invokeListener(listener, target, args) {
      if (typeof listener === "function") {
        return listener.apply(target, args);
      } else {
        return listener.handleEvent(args[0]);
      }
    }
    /**
     * This patches the addEventListener of HTMLElement to be able to
     * auto instrument the click events
     * This is done when zone is not available
     */
    _patchAddEventListener() {
      const plugin = this;
      return (original) => {
        return function addEventListenerPatched(type, listener, useCapture) {
          if (!listener) {
            return original.call(this, type, listener, useCapture);
          }
          const once = useCapture && typeof useCapture === "object" && useCapture.once;
          const patchedListener = function(...args) {
            let parentSpan;
            const event = args[0];
            const target = event?.target;
            if (event) {
              parentSpan = plugin._eventsSpanMap.get(event);
            }
            if (once) {
              plugin.removePatchedListener(this, type, listener);
            }
            const span = plugin._createSpan(target, type, parentSpan);
            if (span) {
              if (event) {
                plugin._eventsSpanMap.set(event, span);
              }
              return context.with(trace.setSpan(context.active(), span), () => {
                const result = plugin._invokeListener(listener, this, args);
                span.end();
                return result;
              });
            } else {
              return plugin._invokeListener(listener, this, args);
            }
          };
          if (plugin.addPatchedListener(this, type, listener, patchedListener)) {
            return original.call(this, type, patchedListener, useCapture);
          }
        };
      };
    }
    /**
     * This patches the removeEventListener of HTMLElement to handle the fact that
     * we patched the original callbacks
     * This is done when zone is not available
     */
    _patchRemoveEventListener() {
      const plugin = this;
      return (original) => {
        return function removeEventListenerPatched(type, listener, useCapture) {
          const wrappedListener = plugin.removePatchedListener(this, type, listener);
          if (wrappedListener) {
            return original.call(this, type, wrappedListener, useCapture);
          } else {
            return original.call(this, type, listener, useCapture);
          }
        };
      };
    }
    /**
     * Most browser provide event listener api via EventTarget in prototype chain.
     * Exception to this is IE 11 which has it on the prototypes closest to EventTarget:
     *
     * * - has addEventListener in IE
     * ** - has addEventListener in all other browsers
     * ! - missing in IE
     *
     * HTMLElement -> Element -> Node * -> EventTarget **! -> Object
     * Document -> Node * -> EventTarget **! -> Object
     * Window * -> WindowProperties ! -> EventTarget **! -> Object
     */
    _getPatchableEventTargets() {
      return window.EventTarget ? [EventTarget.prototype] : [Node.prototype, Window.prototype];
    }
    /**
     * Patches the history api
     */
    _patchHistoryApi() {
      this._unpatchHistoryApi();
      this._wrap(history, "replaceState", this._patchHistoryMethod());
      this._wrap(history, "pushState", this._patchHistoryMethod());
      this._wrap(history, "back", this._patchHistoryMethod());
      this._wrap(history, "forward", this._patchHistoryMethod());
      this._wrap(history, "go", this._patchHistoryMethod());
    }
    /**
     * Patches the certain history api method
     */
    _patchHistoryMethod() {
      const plugin = this;
      return (original) => {
        return function patchHistoryMethod(...args) {
          const url = `${location.pathname}${location.hash}${location.search}`;
          const result = original.apply(this, args);
          const urlAfter = `${location.pathname}${location.hash}${location.search}`;
          if (url !== urlAfter) {
            plugin._updateInteractionName(urlAfter);
          }
          return result;
        };
      };
    }
    /**
     * unpatch the history api methods
     */
    _unpatchHistoryApi() {
      if (isWrapped(history.replaceState))
        this._unwrap(history, "replaceState");
      if (isWrapped(history.pushState))
        this._unwrap(history, "pushState");
      if (isWrapped(history.back))
        this._unwrap(history, "back");
      if (isWrapped(history.forward))
        this._unwrap(history, "forward");
      if (isWrapped(history.go))
        this._unwrap(history, "go");
    }
    /**
     * Updates interaction span name
     * @param url
     */
    _updateInteractionName(url) {
      const span = trace.getSpan(context.active());
      if (span && typeof span.updateName === "function") {
        span.updateName(`${EVENT_NAVIGATION_NAME} ${url}`);
      }
    }
    /**
     * Patches zone cancel task - this is done to be able to correctly
     * decrement the number of remaining tasks
     */
    _patchZoneCancelTask() {
      const plugin = this;
      return (original) => {
        return function patchCancelTask(task) {
          const currentZone = Zone.current;
          const currentSpan = plugin._getCurrentSpan(currentZone);
          if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
            plugin._decrementTask(currentSpan);
          }
          return original.call(this, task);
        };
      };
    }
    /**
     * Patches zone schedule task - this is done to be able to correctly
     * increment the number of tasks running within current zone but also to
     * save time in case of timeout running from xhr plugin when waiting for
     * main request from PerformanceResourceTiming
     */
    _patchZoneScheduleTask() {
      const plugin = this;
      return (original) => {
        return function patchScheduleTask(task) {
          const currentZone = Zone.current;
          const currentSpan = plugin._getCurrentSpan(currentZone);
          if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
            plugin._incrementTask(currentSpan);
            plugin._checkForTimeout(task, currentSpan);
          }
          return original.call(this, task);
        };
      };
    }
    /**
     * Patches zone run task - this is done to be able to create a span when
     * user interaction starts
     * @private
     */
    _patchZoneRunTask() {
      const plugin = this;
      return (original) => {
        return function patchRunTask(task, applyThis, applyArgs) {
          const event = Array.isArray(applyArgs) && applyArgs[0] instanceof Event ? applyArgs[0] : void 0;
          const target = event?.target;
          let span;
          const activeZone = this;
          if (target) {
            span = plugin._createSpan(target, task.eventName);
            if (span) {
              plugin._incrementTask(span);
              return activeZone.run(() => {
                try {
                  return context.with(trace.setSpan(context.active(), span), () => {
                    const currentZone = Zone.current;
                    task._zone = currentZone;
                    return original.call(currentZone, task, applyThis, applyArgs);
                  });
                } finally {
                  plugin._decrementTask(span);
                }
              });
            }
          } else {
            span = plugin._getCurrentSpan(activeZone);
          }
          try {
            return original.call(activeZone, task, applyThis, applyArgs);
          } finally {
            if (span && plugin._shouldCountTask(task, activeZone)) {
              plugin._decrementTask(span);
            }
          }
        };
      };
    }
    /**
     * Decides if task should be counted.
     * @param task
     * @param currentZone
     * @private
     */
    _shouldCountTask(task, currentZone) {
      if (task._zone) {
        currentZone = task._zone;
      }
      if (!currentZone || !task.data || task.data.isPeriodic) {
        return false;
      }
      const currentSpan = this._getCurrentSpan(currentZone);
      if (!currentSpan) {
        return false;
      }
      if (!this._spansData.get(currentSpan)) {
        return false;
      }
      return task.type === "macroTask" || task.type === "microTask";
    }
    /**
     * Will try to end span when such span still exists.
     * @param span
     * @param endTime
     * @private
     */
    _tryToEndSpan(span, endTime) {
      if (span) {
        const spanData = this._spansData.get(span);
        if (spanData) {
          span.end(endTime);
          this._spansData.delete(span);
        }
      }
    }
    /**
     * implements enable function
     */
    enable() {
      const ZoneWithPrototype = this._getZoneWithPrototype();
      this._diag.debug("applying patch to", this.moduleName, this.version, "zone:", !!ZoneWithPrototype);
      if (ZoneWithPrototype) {
        if (isWrapped(ZoneWithPrototype.prototype.runTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "runTask");
          this._diag.debug("removing previous patch from method runTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.scheduleTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "scheduleTask");
          this._diag.debug("removing previous patch from method scheduleTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.cancelTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "cancelTask");
          this._diag.debug("removing previous patch from method cancelTask");
        }
        this._zonePatched = true;
        this._wrap(ZoneWithPrototype.prototype, "runTask", this._patchZoneRunTask());
        this._wrap(ZoneWithPrototype.prototype, "scheduleTask", this._patchZoneScheduleTask());
        this._wrap(ZoneWithPrototype.prototype, "cancelTask", this._patchZoneCancelTask());
      } else {
        this._zonePatched = false;
        const targets = this._getPatchableEventTargets();
        targets.forEach((target) => {
          if (isWrapped(target.addEventListener)) {
            this._unwrap(target, "addEventListener");
            this._diag.debug("removing previous patch from method addEventListener");
          }
          if (isWrapped(target.removeEventListener)) {
            this._unwrap(target, "removeEventListener");
            this._diag.debug("removing previous patch from method removeEventListener");
          }
          this._wrap(target, "addEventListener", this._patchAddEventListener());
          this._wrap(target, "removeEventListener", this._patchRemoveEventListener());
        });
      }
      this._patchHistoryApi();
    }
    /**
     * implements unpatch function
     */
    disable() {
      const ZoneWithPrototype = this._getZoneWithPrototype();
      this._diag.debug("removing patch from", this.moduleName, this.version, "zone:", !!ZoneWithPrototype);
      if (ZoneWithPrototype && this._zonePatched) {
        if (isWrapped(ZoneWithPrototype.prototype.runTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "runTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.scheduleTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "scheduleTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.cancelTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "cancelTask");
        }
      } else {
        const targets = this._getPatchableEventTargets();
        targets.forEach((target) => {
          if (isWrapped(target.addEventListener)) {
            this._unwrap(target, "addEventListener");
          }
          if (isWrapped(target.removeEventListener)) {
            this._unwrap(target, "removeEventListener");
          }
        });
      }
      this._unpatchHistoryApi();
    }
    /**
     * returns Zone
     */
    _getZoneWithPrototype() {
      const _window = window;
      return _window.Zone;
    }
  };

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/semconv.js
  var ATTR_HTTP_HOST2 = "http.host";
  var ATTR_HTTP_METHOD2 = "http.method";
  var ATTR_HTTP_REQUEST_BODY_SIZE2 = "http.request.body.size";
  var ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2 = "http.request_content_length_uncompressed";
  var ATTR_HTTP_SCHEME2 = "http.scheme";
  var ATTR_HTTP_STATUS_CODE2 = "http.status_code";
  var ATTR_HTTP_URL2 = "http.url";
  var ATTR_HTTP_USER_AGENT2 = "http.user_agent";

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/enums/EventNames.js
  var EventNames2;
  (function(EventNames3) {
    EventNames3["METHOD_OPEN"] = "open";
    EventNames3["METHOD_SEND"] = "send";
    EventNames3["EVENT_ABORT"] = "abort";
    EventNames3["EVENT_ERROR"] = "error";
    EventNames3["EVENT_LOAD"] = "loaded";
    EventNames3["EVENT_TIMEOUT"] = "timeout";
  })(EventNames2 || (EventNames2 = {}));

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/utils.js
  var DIAG_LOGGER2 = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-xml-http-request/utils"
  });
  function isDocument2(value) {
    return typeof Document !== "undefined" && value instanceof Document;
  }
  function getXHRBodyLength2(body) {
    if (isDocument2(body)) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (typeof body === "string") {
      return getByteLength2(body);
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body instanceof FormData) {
      return getFormDataSize2(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength2(body.toString());
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    DIAG_LOGGER2.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER2 = new TextEncoder();
  function getByteLength2(s2) {
    return TEXT_ENCODER2.encode(s2).byteLength;
  }
  function getFormDataSize2(formData) {
    let size = 0;
    for (const [key, value] of formData.entries()) {
      size += key.length;
      if (value instanceof Blob) {
        size += value.size;
      } else {
        size += value.length;
      }
    }
    return size;
  }
  function normalizeHttpRequestMethod2(method) {
    const knownMethods3 = getKnownMethods2();
    const methUpper = method.toUpperCase();
    if (methUpper in knownMethods3) {
      return methUpper;
    } else {
      return "_OTHER";
    }
  }
  var DEFAULT_KNOWN_METHODS2 = {
    CONNECT: true,
    DELETE: true,
    GET: true,
    HEAD: true,
    OPTIONS: true,
    PATCH: true,
    POST: true,
    PUT: true,
    TRACE: true
  };
  var knownMethods2;
  function getKnownMethods2() {
    if (knownMethods2 === void 0) {
      const cfgMethods = getStringListFromEnv("OTEL_INSTRUMENTATION_HTTP_KNOWN_METHODS");
      if (cfgMethods && cfgMethods.length > 0) {
        knownMethods2 = {};
        cfgMethods.forEach((m2) => {
          knownMethods2[m2] = true;
        });
      } else {
        knownMethods2 = DEFAULT_KNOWN_METHODS2;
      }
    }
    return knownMethods2;
  }
  var HTTP_PORT_FROM_PROTOCOL2 = {
    "https:": "443",
    "http:": "80"
  };
  function serverPortFromUrl2(url) {
    const serverPort = Number(url.port || HTTP_PORT_FROM_PROTOCOL2[url.protocol]);
    if (serverPort && !isNaN(serverPort)) {
      return serverPort;
    } else {
      return void 0;
    }
  }

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/version.js
  var VERSION6 = "0.205.0";

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/enums/AttributeNames.js
  var AttributeNames4;
  (function(AttributeNames5) {
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames4 || (AttributeNames4 = {}));

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/xhr.js
  var OBSERVER_WAIT_TIME_MS2 = 300;
  var XMLHttpRequestInstrumentation = class extends InstrumentationBase2 {
    component = "xml-http-request";
    version = VERSION6;
    moduleName = this.component;
    _tasksCount = 0;
    _xhrMem = /* @__PURE__ */ new WeakMap();
    _usedResources = /* @__PURE__ */ new WeakSet();
    _semconvStability;
    constructor(config = {}) {
      super("@opentelemetry/instrumentation-xml-http-request", VERSION6, config);
      this._semconvStability = semconvStabilityFromStr("http", config?.semconvStabilityOptIn);
    }
    init() {
    }
    /**
     * Adds custom headers to XMLHttpRequest
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addHeaders(xhr, spanUrl) {
      const url = parseUrl(spanUrl).href;
      if (!shouldPropagateTraceHeaders(url, this.getConfig().propagateTraceHeaderCorsUrls)) {
        const headers2 = {};
        propagation.inject(context.active(), headers2);
        if (Object.keys(headers2).length > 0) {
          this._diag.debug("headers inject skipped due to CORS policy");
        }
        return;
      }
      const headers = {};
      propagation.inject(context.active(), headers);
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, String(headers[key]));
      });
    }
    /**
     * Add cors pre flight child span
     * @param span
     * @param corsPreFlightRequest
     * @private
     */
    _addChildSpan(span, corsPreFlightRequest) {
      context.with(trace.setSpan(context.active(), span), () => {
        const childSpan = this.tracer.startSpan("CORS Preflight", {
          startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
        });
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
        childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
      });
    }
    /**
     * Add attributes when span is going to end
     * @param span
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addFinalSpanAttributes(span, xhrMem, spanUrl) {
      if (this._semconvStability & SemconvStability.OLD) {
        if (xhrMem.status !== void 0) {
          span.setAttribute(ATTR_HTTP_STATUS_CODE2, xhrMem.status);
        }
        if (xhrMem.statusText !== void 0) {
          span.setAttribute(AttributeNames4.HTTP_STATUS_TEXT, xhrMem.statusText);
        }
        if (typeof spanUrl === "string") {
          const parsedUrl = parseUrl(spanUrl);
          span.setAttribute(ATTR_HTTP_HOST2, parsedUrl.host);
          span.setAttribute(ATTR_HTTP_SCHEME2, parsedUrl.protocol.replace(":", ""));
        }
        span.setAttribute(ATTR_HTTP_USER_AGENT2, navigator.userAgent);
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        if (xhrMem.status) {
          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, xhrMem.status);
        }
      }
    }
    _applyAttributesAfterXHR(span, xhr) {
      const applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
      if (typeof applyCustomAttributesOnSpan === "function") {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, xhr), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("applyCustomAttributesOnSpan", error);
        }, true);
      }
    }
    /**
     * will collect information about all resources created
     * between "send" and "end" with additional waiting for main resource
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addResourceObserver(xhr, spanUrl) {
      const xhrMem = this._xhrMem.get(xhr);
      if (!xhrMem || typeof PerformanceObserver !== "function" || typeof PerformanceResourceTiming !== "function") {
        return;
      }
      xhrMem.createdResources = {
        observer: new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const parsedUrl = parseUrl(spanUrl);
          entries.forEach((entry) => {
            if (entry.initiatorType === "xmlhttprequest" && entry.name === parsedUrl.href) {
              if (xhrMem.createdResources) {
                xhrMem.createdResources.entries.push(entry);
              }
            }
          });
        }),
        entries: []
      };
      xhrMem.createdResources.observer.observe({
        entryTypes: ["resource"]
      });
    }
    /**
     * Clears the resource timings and all resources assigned with spans
     *     when {@link XMLHttpRequestInstrumentationConfig.clearTimingResources} is
     *     set to true (default false)
     * @private
     */
    _clearResources() {
      if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
        otperformance.clearResourceTimings();
        this._xhrMem = /* @__PURE__ */ new WeakMap();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      }
    }
    /**
     * Finds appropriate resource and add network events to the span
     * @param span
     */
    _findResourceAndAddNetworkEvents(xhrMem, span, spanUrl, startTime, endTime) {
      if (!spanUrl || !startTime || !endTime || !xhrMem.createdResources) {
        return;
      }
      let resources = xhrMem.createdResources.entries;
      if (!resources || !resources.length) {
        resources = otperformance.getEntriesByType("resource");
      }
      const resource = getResource(parseUrl(spanUrl).href, startTime, endTime, resources, this._usedResources);
      if (resource.mainRequest) {
        const mainRequest = resource.mainRequest;
        this._markResourceAsUsed(mainRequest);
        const corsPreFlightRequest = resource.corsPreFlightRequest;
        if (corsPreFlightRequest) {
          this._addChildSpan(span, corsPreFlightRequest);
          this._markResourceAsUsed(corsPreFlightRequest);
        }
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      }
    }
    /**
     * Removes the previous information about span.
     * This might happened when the same xhr is used again.
     * @param xhr
     * @private
     */
    _cleanPreviousSpanInformation(xhr) {
      const xhrMem = this._xhrMem.get(xhr);
      if (xhrMem) {
        const callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
        if (callbackToRemoveEvents) {
          callbackToRemoveEvents();
        }
        this._xhrMem.delete(xhr);
      }
    }
    /**
     * Creates a new span when method "open" is called
     * @param xhr
     * @param url
     * @param method
     * @private
     */
    _createSpan(xhr, url, method) {
      if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
        this._diag.debug("ignoring span as url matches ignored url");
        return;
      }
      let name = "";
      const parsedUrl = parseUrl(url);
      const attributes = {};
      if (this._semconvStability & SemconvStability.OLD) {
        name = method.toUpperCase();
        attributes[ATTR_HTTP_METHOD2] = method;
        attributes[ATTR_HTTP_URL2] = parsedUrl.toString();
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        const origMethod = method;
        const normMethod = normalizeHttpRequestMethod2(method);
        if (!name) {
          name = normMethod;
        }
        attributes[ATTR_HTTP_REQUEST_METHOD] = normMethod;
        if (normMethod !== origMethod) {
          attributes[ATTR_HTTP_REQUEST_METHOD_ORIGINAL] = origMethod;
        }
        attributes[ATTR_URL_FULL] = parsedUrl.toString();
        attributes[ATTR_SERVER_ADDRESS] = parsedUrl.hostname;
        const serverPort = serverPortFromUrl2(parsedUrl);
        if (serverPort) {
          attributes[ATTR_SERVER_PORT] = serverPort;
        }
      }
      const currentSpan = this.tracer.startSpan(name, {
        kind: SpanKind.CLIENT,
        attributes
      });
      currentSpan.addEvent(EventNames2.METHOD_OPEN);
      this._cleanPreviousSpanInformation(xhr);
      this._xhrMem.set(xhr, {
        span: currentSpan,
        spanUrl: url
      });
      return currentSpan;
    }
    /**
     * Marks certain [resource]{@link PerformanceResourceTiming} when information
     * from this is used to add events to span.
     * This is done to avoid reusing the same resource again for next span
     * @param resource
     * @private
     */
    _markResourceAsUsed(resource) {
      this._usedResources.add(resource);
    }
    /**
     * Patches the method open
     * @private
     */
    _patchOpen() {
      return (original) => {
        const plugin = this;
        return function patchOpen(...args) {
          const method = args[0];
          const url = args[1];
          plugin._createSpan(this, url, method);
          return original.apply(this, args);
        };
      };
    }
    /**
     * Patches the method send
     * @private
     */
    _patchSend() {
      const plugin = this;
      function endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime) {
        const callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
        if (typeof callbackToRemoveEvents === "function") {
          callbackToRemoveEvents();
        }
        const { span, spanUrl, sendStartTime } = xhrMem;
        if (span) {
          plugin._findResourceAndAddNetworkEvents(xhrMem, span, spanUrl, sendStartTime, performanceEndTime);
          span.addEvent(eventName, endTime);
          plugin._addFinalSpanAttributes(span, xhrMem, spanUrl);
          span.end(endTime);
          plugin._tasksCount--;
        }
        plugin._clearResources();
      }
      function endSpan(eventName, xhr, isError, errorType) {
        const xhrMem = plugin._xhrMem.get(xhr);
        if (!xhrMem) {
          return;
        }
        xhrMem.status = xhr.status;
        xhrMem.statusText = xhr.statusText;
        plugin._xhrMem.delete(xhr);
        if (xhrMem.span) {
          const span = xhrMem.span;
          plugin._applyAttributesAfterXHR(span, xhr);
          if (plugin._semconvStability & SemconvStability.STABLE) {
            if (isError) {
              if (errorType) {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: errorType
                });
                span.setAttribute(ATTR_ERROR_TYPE, errorType);
              }
            } else if (xhrMem.status && xhrMem.status >= 400) {
              span.setStatus({ code: SpanStatusCode.ERROR });
              span.setAttribute(ATTR_ERROR_TYPE, String(xhrMem.status));
            }
          }
        }
        const performanceEndTime = hrTime();
        const endTime = Date.now();
        setTimeout(() => {
          endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime);
        }, OBSERVER_WAIT_TIME_MS2);
      }
      function onError() {
        endSpan(EventNames2.EVENT_ERROR, this, true, "error");
      }
      function onAbort() {
        endSpan(EventNames2.EVENT_ABORT, this, false);
      }
      function onTimeout() {
        endSpan(EventNames2.EVENT_TIMEOUT, this, true, "timeout");
      }
      function onLoad() {
        if (this.status < 299) {
          endSpan(EventNames2.EVENT_LOAD, this, false);
        } else {
          endSpan(EventNames2.EVENT_ERROR, this, false);
        }
      }
      function unregister(xhr) {
        xhr.removeEventListener("abort", onAbort);
        xhr.removeEventListener("error", onError);
        xhr.removeEventListener("load", onLoad);
        xhr.removeEventListener("timeout", onTimeout);
        const xhrMem = plugin._xhrMem.get(xhr);
        if (xhrMem) {
          xhrMem.callbackToRemoveEvents = void 0;
        }
      }
      return (original) => {
        return function patchSend(...args) {
          const xhrMem = plugin._xhrMem.get(this);
          if (!xhrMem) {
            return original.apply(this, args);
          }
          const currentSpan = xhrMem.span;
          const spanUrl = xhrMem.spanUrl;
          if (currentSpan && spanUrl) {
            if (plugin.getConfig().measureRequestSize && args?.[0]) {
              const body = args[0];
              const bodyLength = getXHRBodyLength2(body);
              if (bodyLength !== void 0) {
                if (plugin._semconvStability & SemconvStability.OLD) {
                  currentSpan.setAttribute(ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2, bodyLength);
                }
                if (plugin._semconvStability & SemconvStability.STABLE) {
                  currentSpan.setAttribute(ATTR_HTTP_REQUEST_BODY_SIZE2, bodyLength);
                }
              }
            }
            context.with(trace.setSpan(context.active(), currentSpan), () => {
              plugin._tasksCount++;
              xhrMem.sendStartTime = hrTime();
              currentSpan.addEvent(EventNames2.METHOD_SEND);
              this.addEventListener("abort", onAbort);
              this.addEventListener("error", onError);
              this.addEventListener("load", onLoad);
              this.addEventListener("timeout", onTimeout);
              xhrMem.callbackToRemoveEvents = () => {
                unregister(this);
                if (xhrMem.createdResources) {
                  xhrMem.createdResources.observer.disconnect();
                }
              };
              plugin._addHeaders(this, spanUrl);
              plugin._addResourceObserver(this, spanUrl);
            });
          }
          return original.apply(this, args);
        };
      };
    }
    /**
     * implements enable function
     */
    enable() {
      this._diag.debug("applying patch to", this.moduleName, this.version);
      if (isWrapped(XMLHttpRequest.prototype.open)) {
        this._unwrap(XMLHttpRequest.prototype, "open");
        this._diag.debug("removing previous patch from method open");
      }
      if (isWrapped(XMLHttpRequest.prototype.send)) {
        this._unwrap(XMLHttpRequest.prototype, "send");
        this._diag.debug("removing previous patch from method send");
      }
      this._wrap(XMLHttpRequest.prototype, "open", this._patchOpen());
      this._wrap(XMLHttpRequest.prototype, "send", this._patchSend());
    }
    /**
     * implements disable function
     */
    disable() {
      this._diag.debug("removing patch from", this.moduleName, this.version);
      this._unwrap(XMLHttpRequest.prototype, "open");
      this._unwrap(XMLHttpRequest.prototype, "send");
      this._tasksCount = 0;
      this._xhrMem = /* @__PURE__ */ new WeakMap();
      this._usedResources = /* @__PURE__ */ new WeakSet();
    }
  };

  // node_modules/@opentelemetry/auto-instrumentations-web/build/esm/utils.js
  var InstrumentationMap = {
    "@opentelemetry/instrumentation-document-load": DocumentLoadInstrumentation,
    "@opentelemetry/instrumentation-fetch": FetchInstrumentation,
    "@opentelemetry/instrumentation-user-interaction": UserInteractionInstrumentation2,
    "@opentelemetry/instrumentation-xml-http-request": XMLHttpRequestInstrumentation
  };
  function getWebAutoInstrumentations(inputConfigs = {}) {
    for (const name of Object.keys(inputConfigs)) {
      if (!Object.prototype.hasOwnProperty.call(InstrumentationMap, name)) {
        diag2.error(`Provided instrumentation name "${name}" not found`);
        continue;
      }
    }
    const instrumentations = [];
    for (const name of Object.keys(InstrumentationMap)) {
      const Instance = InstrumentationMap[name];
      const userConfig = inputConfigs[name] ?? {};
      if (userConfig.enabled === false) {
        diag2.debug(`Disabling instrumentation for ${name}`);
        continue;
      }
      try {
        diag2.debug(`Loading instrumentation for ${name}`);
        instrumentations.push(new Instance(userConfig));
      } catch (e2) {
        diag2.error(e2);
      }
    }
    return instrumentations;
  }

  // src/hny.js
  var MY_VERSION = "0.10.40";
  function initializeTracing(params) {
    if (!params) {
      params = {};
    }
    if (!params.apiKey) {
      throw new Error("Usage: initializeTracing({ apiKey: 'honeycomb api key', serviceName: 'name of this service' })");
    }
    if (!params.serviceName) {
      console.log("No service name provided to initializeTracing. Defaulting to unknown_service");
      params.serviceName = "unknown_service";
    }
    function addContentLengthToSpan(span, resource) {
      const encodedLength = resource.encodedBodySize;
      if (encodedLength !== void 0) {
        span.setAttribute("http.request_content_length", encodedLength);
      }
      const decodedLength = resource.decodedBodySize;
      if (decodedLength !== void 0 && encodedLength !== decodedLength) {
        span.setAttribute(
          "http.response_content_length_uncompressed",
          //SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED,
          decodedLength
        );
      }
    }
    const configDefaults = {
      ignoreNetworkEvents: true,
      propagateTraceHeaderCorsUrls: [/localhost/g, /jessitron/g, /127\.0\.0\.1/]
    };
    const sdk = new HoneycombWebSDK({
      // endpoint: "https://api.eu1.honeycomb.io/v1/traces", // Send to EU instance of Honeycomb. Defaults to sending to US instance.
      localVisualizations: params.debug,
      instrumentations: [
        getWebAutoInstrumentations({
          // Loads custom configuration for xml-http-request instrumentation.
          "@opentelemetry/instrumentation-xml-http-request": configDefaults,
          "@opentelemetry/instrumentation-fetch": configDefaults,
          "@opentelemetry/instrumentation-document-load": {
            applyCustomAttributesOnSpan: {
              resourceFetch: addContentLengthToSpan
            },
            ...configDefaults
          }
        })
      ],
      ...params
    });
    sdk.start();
    if (params.debug) {
      sendTestSpan();
    }
    if (params.provideOneLinkToHoneycomb) {
      const tracesEndpoint = params.endpoint || "https://api.honeycomb.io";
      const apiOrigin = new URL(tracesEndpoint).origin;
      const authEndpoint = apiOrigin + "/1/auth";
      const uiOrigin = apiOrigin.replace("api", "ui");
      const datasetSlug = params.serviceName || "unknown_service";
      fetch(authEndpoint, { headers: { "X-Honeycomb-Team": params.apiKey } }).then((result) => result.json()).then((data) => {
        const datasetQueryUrl = `${uiOrigin}/${data.team.slug}/environments/${data.environment.slug}/datasets/${datasetSlug}`;
        console.log(`Query your traces: ${datasetQueryUrl}`);
      });
    }
    console.log(`Hny-otel-web tracing initialized, ${MY_VERSION} at last update of this message`);
  }
  function sendTestSpan() {
    const span = getTracer({
      name: "hny-otel-web test",
      version: MY_VERSION
    }).startSpan("test span");
    console.log("Sending test span", span.spanContext());
    span.end();
  }
  function activeSpanContext() {
    return trace.getActiveSpan()?.spanContext();
  }
  function setAttributes(attributes) {
    const span = trace.getActiveSpan();
    span && span.setAttributes(attributes);
  }
  function getTracer(inputTracer) {
    let tracerName, tracerVersion;
    if (typeof inputTracer === "string") {
      tracerName = inputTracer;
    } else {
      tracerName = inputTracer.name || "missing tracer name";
      tracerVersion = inputTracer.version;
    }
    return trace.getTracer(tracerName, tracerVersion);
  }
  function inSpan(inputTracer, spanName, fn, context2) {
    if (fn === void 0 || typeof fn !== "function") {
      throw new Error("USAGE: inSpan(tracerName, spanName, () => { ... })");
    }
    return getTracer(inputTracer).startActiveSpan(spanName, {}, context2 || null, (span) => {
      try {
        return fn(span);
      } catch (err) {
        span.setStatus({
          code: 2,
          //SpanStatusCode.ERROR,
          message: err.message
        });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
  async function inSpanAsync(inputTracer, spanName, fn, context2) {
    if (fn === void 0) {
      console.log("USAGE: inSpanAsync(tracerName, spanName, async () => { ... })");
    }
    return getTracer(inputTracer).startActiveSpan(spanName, {}, context2, async (span) => {
      try {
        return await fn(span);
      } catch (err) {
        span.setStatus({
          code: 2,
          // trace.SpanStatusCode.ERROR,
          message: err.message
        });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
  function recordException2(exception, additionalAttributes) {
    const span = trace.getActiveSpan();
    if (!span) {
      return;
    }
    const attributes = {};
    if (typeof exception === "string") {
      attributes[ATTR_EXCEPTION_MESSAGE] = exception;
    } else if (exception) {
      if (exception.code) {
        attributes[ATTR_EXCEPTION_TYPE] = exception.code.toString();
      } else if (exception.name) {
        attributes[ATTR_EXCEPTION_TYPE] = exception.name;
      }
      if (exception.message) {
        attributes[ATTR_EXCEPTION_MESSAGE] = exception.message;
      }
      if (exception.stack) {
        attributes[ATTR_EXCEPTION_STACKTRACE] = exception.stack;
      }
    }
    const allAttributes = { ...attributes, ...additionalAttributes };
    span.addEvent("exception", allAttributes);
    span.setStatus({
      code: 2,
      // SpanStatusCode.ERROR,
      message: attributes[ATTR_EXCEPTION_MESSAGE]
    });
  }
  function addSpanEvent(message, attributes) {
    const span = trace.getActiveSpan();
    span?.addEvent(message, attributes);
  }
  function inChildSpan(inputTracer, spanName, spanContext, fn) {
    if (!!spanContext && (!spanContext.spanId || !spanContext.traceId)) {
      console.log("inChildSpan: the third argument should be a spanContext (or undefined to use the active context)");
      fn = spanContext;
      spanContext = fn;
    }
    const usefulContext = !!spanContext ? trace.setSpanContext(context.active(), spanContext) : context.active();
    return inSpan(inputTracer, spanName, fn, usefulContext);
  }
  var Hny = {
    initializeTracing,
    setAttributes,
    inSpan,
    inSpanAsync,
    recordException: recordException2,
    addSpanEvent,
    activeSpanContext,
    inChildSpan
  };
  window.Hny = Hny;
})();
/*! Bundled license information:

tracekit/tracekit.js:
  (**
   * https://github.com/csnover/TraceKit
   * @license MIT
   * @namespace TraceKit
   *)
*/
