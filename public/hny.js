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
      var logger = console.error.bind(console);
      function defineProperty(obj, name, value) {
        var enumerable = !!obj[name] && obj.propertyIsEnumerable(name);
        Object.defineProperty(obj, name, {
          configurable: true,
          enumerable,
          writable: true,
          value
        });
      }
      function shimmer3(options) {
        if (options && options.logger) {
          if (!isFunction2(options.logger)) logger("new logger isn't a function, not replacing");
          else logger = options.logger;
        }
      }
      function wrap3(nodule, name, wrapper) {
        if (!nodule || !nodule[name]) {
          logger("no original function " + name + " to wrap");
          return;
        }
        if (!wrapper) {
          logger("no wrapper function");
          logger(new Error().stack);
          return;
        }
        if (!isFunction2(nodule[name]) || !isFunction2(wrapper)) {
          logger("original object and wrapper must be functions");
          return;
        }
        var original = nodule[name];
        var wrapped = wrapper(original, name);
        defineProperty(wrapped, "__original", original);
        defineProperty(wrapped, "__unwrap", function() {
          if (nodule[name] === wrapped) defineProperty(nodule, name, original);
        });
        defineProperty(wrapped, "__wrapped", true);
        defineProperty(nodule, name, wrapped);
        return wrapped;
      }
      function massWrap3(nodules, names, wrapper) {
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
        nodules.forEach(function(nodule) {
          names.forEach(function(name) {
            wrap3(nodule, name, wrapper);
          });
        });
      }
      function unwrap3(nodule, name) {
        if (!nodule || !nodule[name]) {
          logger("no function to unwrap.");
          logger(new Error().stack);
          return;
        }
        if (!nodule[name].__unwrap) {
          logger("no original to unwrap to -- has " + name + " already been unwrapped?");
        } else {
          return nodule[name].__unwrap();
        }
      }
      function massUnwrap3(nodules, names) {
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
        nodules.forEach(function(nodule) {
          names.forEach(function(name) {
            unwrap3(nodule, name);
          });
        });
      }
      shimmer3.wrap = wrap3;
      shimmer3.massWrap = massWrap3;
      shimmer3.unwrap = unwrap3;
      shimmer3.massUnwrap = massUnwrap3;
      module.exports = shimmer3;
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
    var _a3;
    if (allowOverride === void 0) {
      allowOverride = false;
    }
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a3 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a3 !== void 0 ? _a3 : {
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
    var _a3, _b;
    var globalVersion = (_a3 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a3 === void 0 ? void 0 : _a3.version;
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
    var logger = getGlobal("diag");
    if (!logger) {
      return;
    }
    args.unshift(namespace);
    return logger[funcName].apply(logger, __spreadArray([], __read(args), false));
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
  function createLogLevelDiagLogger(maxLevel, logger) {
    if (maxLevel < DiagLogLevel.NONE) {
      maxLevel = DiagLogLevel.NONE;
    } else if (maxLevel > DiagLogLevel.ALL) {
      maxLevel = DiagLogLevel.ALL;
    }
    logger = logger || {};
    function _filterFunc(funcName, theLevel) {
      var theFunc = logger[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) {
        return theFunc.bind(logger);
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
            var logger = getGlobal("diag");
            if (!logger)
              return;
            return logger[funcName].apply(logger, __spreadArray2([], __read2(args), false));
          };
        }
        var self2 = this;
        var setLogger = function(logger, optionsOrLogLevel) {
          var _a3, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger === self2) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a3 = err.stack) !== null && _a3 !== void 0 ? _a3 : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
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
        return Array.from(this._entries.entries()).map(function(_a3) {
          var _b = __read3(_a3, 2), k2 = _b[0], v2 = _b[1];
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
        var e_1, _a3;
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
            if (keys_1_1 && !keys_1_1.done && (_a3 = keys_1.return)) _a3.call(keys_1);
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
        var _a3;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a3 = this._getContextManager()).with.apply(_a3, __spreadArray4([context2, fn, thisArg], __read5(args), false));
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
    var _a3;
    return (_a3 = getSpan(context2)) === null || _a3 === void 0 ? void 0 : _a3.spanContext();
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
        var _a3;
        return (_a3 = this.getDelegateTracer(name, version, options)) !== null && _a3 !== void 0 ? _a3 : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a3;
        return (_a3 = this._delegate) !== null && _a3 !== void 0 ? _a3 : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a3;
        return (_a3 = this._delegate) === null || _a3 === void 0 ? void 0 : _a3.getTracer(name, version, options);
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

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLogger.js
  var NoopLogger = (
    /** @class */
    function() {
      function NoopLogger2() {
      }
      NoopLogger2.prototype.emit = function(_logRecord) {
      };
      return NoopLogger2;
    }()
  );
  var NOOP_LOGGER = new NoopLogger();

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLoggerProvider.js
  var NoopLoggerProvider = (
    /** @class */
    function() {
      function NoopLoggerProvider2() {
      }
      NoopLoggerProvider2.prototype.getLogger = function(_name, _version, _options) {
        return new NoopLogger();
      };
      return NoopLoggerProvider2;
    }()
  );
  var NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLogger.js
  var ProxyLogger = (
    /** @class */
    function() {
      function ProxyLogger2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyLogger2.prototype.emit = function(logRecord) {
        this._getLogger().emit(logRecord);
      };
      ProxyLogger2.prototype._getLogger = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var logger = this._provider.getDelegateLogger(this.name, this.version, this.options);
        if (!logger) {
          return NOOP_LOGGER;
        }
        this._delegate = logger;
        return this._delegate;
      };
      return ProxyLogger2;
    }()
  );

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
  var ProxyLoggerProvider = (
    /** @class */
    function() {
      function ProxyLoggerProvider2() {
      }
      ProxyLoggerProvider2.prototype.getLogger = function(name, version, options) {
        var _a3;
        return (_a3 = this.getDelegateLogger(name, version, options)) !== null && _a3 !== void 0 ? _a3 : new ProxyLogger(this, name, version, options);
      };
      ProxyLoggerProvider2.prototype.getDelegate = function() {
        var _a3;
        return (_a3 = this._delegate) !== null && _a3 !== void 0 ? _a3 : NOOP_LOGGER_PROVIDER;
      };
      ProxyLoggerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyLoggerProvider2.prototype.getDelegateLogger = function(name, version, options) {
        var _a3;
        return (_a3 = this._delegate) === null || _a3 === void 0 ? void 0 : _a3.getLogger(name, version, options);
      };
      return ProxyLoggerProvider2;
    }()
  );

  // node_modules/@opentelemetry/api-logs/build/esm/platform/browser/globalThis.js
  var _globalThis2 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/api-logs/build/esm/internal/global-utils.js
  var GLOBAL_LOGS_API_KEY = Symbol.for("io.opentelemetry.js.api.logs");
  var _global2 = _globalThis2;
  function makeGetter(requiredVersion, instance, fallback) {
    return function(version) {
      return version === requiredVersion ? instance : fallback;
    };
  }
  var API_BACKWARDS_COMPATIBILITY_VERSION = 1;

  // node_modules/@opentelemetry/api-logs/build/esm/api/logs.js
  var LogsAPI = (
    /** @class */
    function() {
      function LogsAPI2() {
        this._proxyLoggerProvider = new ProxyLoggerProvider();
      }
      LogsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new LogsAPI2();
        }
        return this._instance;
      };
      LogsAPI2.prototype.setGlobalLoggerProvider = function(provider) {
        if (_global2[GLOBAL_LOGS_API_KEY]) {
          return this.getLoggerProvider();
        }
        _global2[GLOBAL_LOGS_API_KEY] = makeGetter(API_BACKWARDS_COMPATIBILITY_VERSION, provider, NOOP_LOGGER_PROVIDER);
        this._proxyLoggerProvider.setDelegate(provider);
        return provider;
      };
      LogsAPI2.prototype.getLoggerProvider = function() {
        var _a3, _b;
        return (_b = (_a3 = _global2[GLOBAL_LOGS_API_KEY]) === null || _a3 === void 0 ? void 0 : _a3.call(_global2, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
      };
      LogsAPI2.prototype.getLogger = function(name, version, options) {
        return this.getLoggerProvider().getLogger(name, version, options);
      };
      LogsAPI2.prototype.disable = function() {
        delete _global2[GLOBAL_LOGS_API_KEY];
        this._proxyLoggerProvider = new ProxyLoggerProvider();
      };
      return LogsAPI2;
    }()
  );

  // node_modules/@opentelemetry/api-logs/build/esm/index.js
  var logs = LogsAPI.getInstance();

  // node_modules/@opentelemetry/instrumentation/build/esm/autoLoaderUtils.js
  function enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider) {
    for (var i2 = 0, j2 = instrumentations.length; i2 < j2; i2++) {
      var instrumentation = instrumentations[i2];
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
    instrumentations.forEach(function(instrumentation) {
      return instrumentation.disable();
    });
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/autoLoader.js
  function registerInstrumentations(options) {
    var _a3, _b;
    var tracerProvider = options.tracerProvider || trace.getTracerProvider();
    var meterProvider = options.meterProvider || metrics.getMeterProvider();
    var loggerProvider = options.loggerProvider || logs.getLoggerProvider();
    var instrumentations = (_b = (_a3 = options.instrumentations) === null || _a3 === void 0 ? void 0 : _a3.flat()) !== null && _b !== void 0 ? _b : [];
    enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider);
    return function() {
      disableInstrumentations(instrumentations);
    };
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/instrumentation.js
  var shimmer = __toESM(require_shimmer());
  var __assign = function() {
    __assign = Object.assign || function(t3) {
      for (var s2, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
        s2 = arguments[i2];
        for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2))
          t3[p2] = s2[p2];
      }
      return t3;
    };
    return __assign.apply(this, arguments);
  };
  var InstrumentationAbstract = (
    /** @class */
    function() {
      function InstrumentationAbstract3(instrumentationName, instrumentationVersion, config) {
        this.instrumentationName = instrumentationName;
        this.instrumentationVersion = instrumentationVersion;
        this._config = {};
        this._wrap = shimmer.wrap;
        this._unwrap = shimmer.unwrap;
        this._massWrap = shimmer.massWrap;
        this._massUnwrap = shimmer.massUnwrap;
        this.setConfig(config);
        this._diag = diag2.createComponentLogger({
          namespace: instrumentationName
        });
        this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
        this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
        this._logger = logs.getLogger(instrumentationName, instrumentationVersion);
        this._updateMetricInstruments();
      }
      Object.defineProperty(InstrumentationAbstract3.prototype, "meter", {
        /* Returns meter */
        get: function() {
          return this._meter;
        },
        enumerable: false,
        configurable: true
      });
      InstrumentationAbstract3.prototype.setMeterProvider = function(meterProvider) {
        this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
        this._updateMetricInstruments();
      };
      Object.defineProperty(InstrumentationAbstract3.prototype, "logger", {
        /* Returns logger */
        get: function() {
          return this._logger;
        },
        enumerable: false,
        configurable: true
      });
      InstrumentationAbstract3.prototype.setLoggerProvider = function(loggerProvider) {
        this._logger = loggerProvider.getLogger(this.instrumentationName, this.instrumentationVersion);
      };
      InstrumentationAbstract3.prototype.getModuleDefinitions = function() {
        var _a3;
        var initResult = (_a3 = this.init()) !== null && _a3 !== void 0 ? _a3 : [];
        if (!Array.isArray(initResult)) {
          return [initResult];
        }
        return initResult;
      };
      InstrumentationAbstract3.prototype._updateMetricInstruments = function() {
        return;
      };
      InstrumentationAbstract3.prototype.getConfig = function() {
        return this._config;
      };
      InstrumentationAbstract3.prototype.setConfig = function(config) {
        this._config = __assign({ enabled: true }, config);
      };
      InstrumentationAbstract3.prototype.setTracerProvider = function(tracerProvider) {
        this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
      };
      Object.defineProperty(InstrumentationAbstract3.prototype, "tracer", {
        /* Returns tracer */
        get: function() {
          return this._tracer;
        },
        enumerable: false,
        configurable: true
      });
      InstrumentationAbstract3.prototype._runSpanCustomizationHook = function(hookHandler, triggerName, span, info) {
        if (!hookHandler) {
          return;
        }
        try {
          hookHandler(span, info);
        } catch (e2) {
          this._diag.error("Error running span customization hook due to exception in handler", { triggerName }, e2);
        }
      };
      return InstrumentationAbstract3;
    }()
  );

  // node_modules/@opentelemetry/instrumentation/build/esm/platform/browser/instrumentation.js
  var __extends2 = /* @__PURE__ */ function() {
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
  var InstrumentationBase = (
    /** @class */
    function(_super) {
      __extends2(InstrumentationBase2, _super);
      function InstrumentationBase2(instrumentationName, instrumentationVersion, config) {
        var _this = _super.call(this, instrumentationName, instrumentationVersion, config) || this;
        if (_this._config.enabled) {
          _this.enable();
        }
        return _this;
      }
      return InstrumentationBase2;
    }(InstrumentationAbstract)
  );

  // node_modules/@opentelemetry/instrumentation/build/esm/utils.js
  function safeExecuteInTheMiddle(execute, onFinish, preventThrowingError) {
    var error;
    var result;
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

  // node_modules/@opentelemetry/resources/node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
  var TMP_SERVICE_NAME = "service.name";
  var TMP_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
  var TMP_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
  var TMP_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
  var SEMRESATTRS_SERVICE_NAME = TMP_SERVICE_NAME;
  var SEMRESATTRS_TELEMETRY_SDK_NAME = TMP_TELEMETRY_SDK_NAME;
  var SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = TMP_TELEMETRY_SDK_LANGUAGE;
  var SEMRESATTRS_TELEMETRY_SDK_VERSION = TMP_TELEMETRY_SDK_VERSION;

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
  var __read6 = function(o2, n2) {
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
  function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce(function(hValue, current) {
      var value = "" + hValue + (hValue !== "" ? BAGGAGE_ITEMS_SEPARATOR : "") + current;
      return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, "");
  }
  function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(function(_a3) {
      var _b = __read6(_a3, 2), key = _b[0], value = _b[1];
      var entry = encodeURIComponent(key) + "=" + encodeURIComponent(value.value);
      if (value.metadata !== void 0) {
        entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
      }
      return entry;
    });
  }
  function parsePairKeyValue(entry) {
    var valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
      return;
    var keyPairPart = valueProps.shift();
    if (!keyPairPart)
      return;
    var separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0)
      return;
    var key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    var value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    var metadata;
    if (valueProps.length > 0) {
      metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key, value, metadata };
  }

  // node_modules/@opentelemetry/core/build/esm/baggage/propagation/W3CBaggagePropagator.js
  var W3CBaggagePropagator = (
    /** @class */
    function() {
      function W3CBaggagePropagator2() {
      }
      W3CBaggagePropagator2.prototype.inject = function(context2, carrier, setter) {
        var baggage = propagation.getBaggage(context2);
        if (!baggage || isTracingSuppressed(context2))
          return;
        var keyPairs = getKeyPairs(baggage).filter(function(pair) {
          return pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
        }).slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
        var headerValue = serializeKeyPairs(keyPairs);
        if (headerValue.length > 0) {
          setter.set(carrier, BAGGAGE_HEADER, headerValue);
        }
      };
      W3CBaggagePropagator2.prototype.extract = function(context2, carrier, getter) {
        var headerValue = getter.get(carrier, BAGGAGE_HEADER);
        var baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;
        if (!baggageString)
          return context2;
        var baggage = {};
        if (baggageString.length === 0) {
          return context2;
        }
        var pairs = baggageString.split(BAGGAGE_ITEMS_SEPARATOR);
        pairs.forEach(function(entry) {
          var keyPair = parsePairKeyValue(entry);
          if (keyPair) {
            var baggageEntry = { value: keyPair.value };
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
      };
      W3CBaggagePropagator2.prototype.fields = function() {
        return [BAGGAGE_HEADER];
      };
      return W3CBaggagePropagator2;
    }()
  );

  // node_modules/@opentelemetry/core/build/esm/common/attributes.js
  var __values2 = function(o2) {
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
  var __read7 = function(o2, n2) {
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
  function sanitizeAttributes(attributes) {
    var e_1, _a3;
    var out = {};
    if (typeof attributes !== "object" || attributes == null) {
      return out;
    }
    try {
      for (var _b = __values2(Object.entries(attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read7(_c.value, 2), key = _d[0], val = _d[1];
        if (!isAttributeKey(key)) {
          diag2.warn("Invalid attribute key: " + key);
          continue;
        }
        if (!isAttributeValue(val)) {
          diag2.warn("Invalid attribute value set for key: " + key);
          continue;
        }
        if (Array.isArray(val)) {
          out[key] = val.slice();
        } else {
          out[key] = val;
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
      } finally {
        if (e_1) throw e_1.error;
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
    var e_2, _a3;
    var type;
    try {
      for (var arr_1 = __values2(arr), arr_1_1 = arr_1.next(); !arr_1_1.done; arr_1_1 = arr_1.next()) {
        var element = arr_1_1.value;
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
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (arr_1_1 && !arr_1_1.done && (_a3 = arr_1.return)) _a3.call(arr_1);
      } finally {
        if (e_2) throw e_2.error;
      }
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
    return function(ex) {
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
    var result = {};
    var current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach(function(propertyName) {
        if (result[propertyName])
          return;
        var value = current[propertyName];
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
    } catch (_a3) {
    }
  }

  // node_modules/@opentelemetry/core/build/esm/utils/sampling.js
  var TracesSamplerValues;
  (function(TracesSamplerValues2) {
    TracesSamplerValues2["AlwaysOff"] = "always_off";
    TracesSamplerValues2["AlwaysOn"] = "always_on";
    TracesSamplerValues2["ParentBasedAlwaysOff"] = "parentbased_always_off";
    TracesSamplerValues2["ParentBasedAlwaysOn"] = "parentbased_always_on";
    TracesSamplerValues2["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
    TracesSamplerValues2["TraceIdRatio"] = "traceidratio";
  })(TracesSamplerValues || (TracesSamplerValues = {}));

  // node_modules/@opentelemetry/core/build/esm/utils/environment.js
  var DEFAULT_LIST_SEPARATOR = ",";
  var ENVIRONMENT_BOOLEAN_KEYS = ["OTEL_SDK_DISABLED"];
  function isEnvVarABoolean(key) {
    return ENVIRONMENT_BOOLEAN_KEYS.indexOf(key) > -1;
  }
  var ENVIRONMENT_NUMBERS_KEYS = [
    "OTEL_BSP_EXPORT_TIMEOUT",
    "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BSP_MAX_QUEUE_SIZE",
    "OTEL_BSP_SCHEDULE_DELAY",
    "OTEL_BLRP_EXPORT_TIMEOUT",
    "OTEL_BLRP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BLRP_MAX_QUEUE_SIZE",
    "OTEL_BLRP_SCHEDULE_DELAY",
    "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_LINK_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT",
    "OTEL_EXPORTER_OTLP_TIMEOUT",
    "OTEL_EXPORTER_OTLP_TRACES_TIMEOUT",
    "OTEL_EXPORTER_OTLP_METRICS_TIMEOUT",
    "OTEL_EXPORTER_OTLP_LOGS_TIMEOUT",
    "OTEL_EXPORTER_JAEGER_AGENT_PORT"
  ];
  function isEnvVarANumber(key) {
    return ENVIRONMENT_NUMBERS_KEYS.indexOf(key) > -1;
  }
  var ENVIRONMENT_LISTS_KEYS = [
    "OTEL_NO_PATCH_MODULES",
    "OTEL_PROPAGATORS",
    "OTEL_SEMCONV_STABILITY_OPT_IN"
  ];
  function isEnvVarAList(key) {
    return ENVIRONMENT_LISTS_KEYS.indexOf(key) > -1;
  }
  var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
  var DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT = 128;
  var DEFAULT_ENVIRONMENT = {
    OTEL_SDK_DISABLED: false,
    CONTAINER_NAME: "",
    ECS_CONTAINER_METADATA_URI_V4: "",
    ECS_CONTAINER_METADATA_URI: "",
    HOSTNAME: "",
    KUBERNETES_SERVICE_HOST: "",
    NAMESPACE: "",
    OTEL_BSP_EXPORT_TIMEOUT: 3e4,
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BSP_MAX_QUEUE_SIZE: 2048,
    OTEL_BSP_SCHEDULE_DELAY: 5e3,
    OTEL_BLRP_EXPORT_TIMEOUT: 3e4,
    OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BLRP_MAX_QUEUE_SIZE: 2048,
    OTEL_BLRP_SCHEDULE_DELAY: 5e3,
    OTEL_EXPORTER_JAEGER_AGENT_HOST: "",
    OTEL_EXPORTER_JAEGER_AGENT_PORT: 6832,
    OTEL_EXPORTER_JAEGER_ENDPOINT: "",
    OTEL_EXPORTER_JAEGER_PASSWORD: "",
    OTEL_EXPORTER_JAEGER_USER: "",
    OTEL_EXPORTER_OTLP_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_HEADERS: "",
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: "",
    OTEL_EXPORTER_OTLP_METRICS_HEADERS: "",
    OTEL_EXPORTER_OTLP_LOGS_HEADERS: "",
    OTEL_EXPORTER_OTLP_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_TRACES_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_LOGS_TIMEOUT: 1e4,
    OTEL_EXPORTER_ZIPKIN_ENDPOINT: "http://localhost:9411/api/v2/spans",
    OTEL_LOG_LEVEL: DiagLogLevel.INFO,
    OTEL_NO_PATCH_MODULES: [],
    OTEL_PROPAGATORS: ["tracecontext", "baggage"],
    OTEL_RESOURCE_ATTRIBUTES: "",
    OTEL_SERVICE_NAME: "",
    OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_EVENT_COUNT_LIMIT: 128,
    OTEL_SPAN_LINK_COUNT_LIMIT: 128,
    OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT,
    OTEL_TRACES_EXPORTER: "",
    OTEL_TRACES_SAMPLER: TracesSamplerValues.ParentBasedAlwaysOn,
    OTEL_TRACES_SAMPLER_ARG: "",
    OTEL_LOGS_EXPORTER: "",
    OTEL_EXPORTER_OTLP_INSECURE: "",
    OTEL_EXPORTER_OTLP_TRACES_INSECURE: "",
    OTEL_EXPORTER_OTLP_METRICS_INSECURE: "",
    OTEL_EXPORTER_OTLP_LOGS_INSECURE: "",
    OTEL_EXPORTER_OTLP_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "cumulative",
    OTEL_SEMCONV_STABILITY_OPT_IN: []
  };
  function parseBoolean(key, environment, values) {
    if (typeof values[key] === "undefined") {
      return;
    }
    var value = String(values[key]);
    environment[key] = value.toLowerCase() === "true";
  }
  function parseNumber(name, environment, values, min, max) {
    if (min === void 0) {
      min = -Infinity;
    }
    if (max === void 0) {
      max = Infinity;
    }
    if (typeof values[name] !== "undefined") {
      var value = Number(values[name]);
      if (!isNaN(value)) {
        if (value < min) {
          environment[name] = min;
        } else if (value > max) {
          environment[name] = max;
        } else {
          environment[name] = value;
        }
      }
    }
  }
  function parseStringList(name, output, input, separator) {
    if (separator === void 0) {
      separator = DEFAULT_LIST_SEPARATOR;
    }
    var givenValue = input[name];
    if (typeof givenValue === "string") {
      output[name] = givenValue.split(separator).map(function(v2) {
        return v2.trim();
      });
    }
  }
  var logLevelMap = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE
  };
  function setLogLevelFromEnv(key, environment, values) {
    var value = values[key];
    if (typeof value === "string") {
      var theLevel = logLevelMap[value.toUpperCase()];
      if (theLevel != null) {
        environment[key] = theLevel;
      }
    }
  }
  function parseEnvironment(values) {
    var environment = {};
    for (var env in DEFAULT_ENVIRONMENT) {
      var key = env;
      switch (key) {
        case "OTEL_LOG_LEVEL":
          setLogLevelFromEnv(key, environment, values);
          break;
        default:
          if (isEnvVarABoolean(key)) {
            parseBoolean(key, environment, values);
          } else if (isEnvVarANumber(key)) {
            parseNumber(key, environment, values);
          } else if (isEnvVarAList(key)) {
            parseStringList(key, environment, values);
          } else {
            var value = values[key];
            if (typeof value !== "undefined" && value !== null) {
              environment[key] = String(value);
            }
          }
      }
    }
    return environment;
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/globalThis.js
  var _globalThis3 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getEnv() {
    var globalEnv = parseEnvironment(_globalThis3);
    return Object.assign({}, DEFAULT_ENVIRONMENT, globalEnv);
  }
  function getEnvWithoutDefaults() {
    return parseEnvironment(_globalThis3);
  }

  // node_modules/@opentelemetry/core/build/esm/common/hex-to-binary.js
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
    var buf = new Uint8Array(hexStr.length / 2);
    var offset = 0;
    for (var i2 = 0; i2 < hexStr.length; i2 += 2) {
      var hi = intValue(hexStr.charCodeAt(i2));
      var lo = intValue(hexStr.charCodeAt(i2 + 1));
      buf[offset++] = hi << 4 | lo;
    }
    return buf;
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/performance.js
  var otperformance = performance;

  // node_modules/@opentelemetry/core/build/esm/version.js
  var VERSION2 = "1.30.1";

  // node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
  var TMP_PROCESS_RUNTIME_NAME = "process.runtime.name";
  var TMP_TELEMETRY_SDK_NAME2 = "telemetry.sdk.name";
  var TMP_TELEMETRY_SDK_LANGUAGE2 = "telemetry.sdk.language";
  var TMP_TELEMETRY_SDK_VERSION2 = "telemetry.sdk.version";
  var SEMRESATTRS_PROCESS_RUNTIME_NAME = TMP_PROCESS_RUNTIME_NAME;
  var SEMRESATTRS_TELEMETRY_SDK_NAME2 = TMP_TELEMETRY_SDK_NAME2;
  var SEMRESATTRS_TELEMETRY_SDK_LANGUAGE2 = TMP_TELEMETRY_SDK_LANGUAGE2;
  var SEMRESATTRS_TELEMETRY_SDK_VERSION2 = TMP_TELEMETRY_SDK_VERSION2;
  var TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS = "webjs";
  var TELEMETRYSDKLANGUAGEVALUES_WEBJS = TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS;

  // node_modules/@opentelemetry/core/build/esm/platform/browser/sdk-info.js
  var _a;
  var SDK_INFO = (_a = {}, _a[SEMRESATTRS_TELEMETRY_SDK_NAME2] = "opentelemetry", _a[SEMRESATTRS_PROCESS_RUNTIME_NAME] = "browser", _a[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE2] = TELEMETRYSDKLANGUAGEVALUES_WEBJS, _a[SEMRESATTRS_TELEMETRY_SDK_VERSION2] = VERSION2, _a);

  // node_modules/@opentelemetry/core/build/esm/platform/browser/timer-util.js
  function unrefTimer(_timer) {
  }

  // node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS = 9;
  var NANOSECOND_DIGITS_IN_MILLIS = 6;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    var epochSeconds = epochMillis / 1e3;
    var seconds = Math.trunc(epochSeconds);
    var nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS);
    return [seconds, nanos];
  }
  function getTimeOrigin() {
    var timeOrigin = otperformance.timeOrigin;
    if (typeof timeOrigin !== "number") {
      var perf = otperformance;
      timeOrigin = perf.timing && perf.timing.fetchStart;
    }
    return timeOrigin;
  }
  function hrTime(performanceNow) {
    var timeOrigin = millisToHrTime(getTimeOrigin());
    var now = millisToHrTime(typeof performanceNow === "number" ? performanceNow : otperformance.now());
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
    var seconds = endTime[0] - startTime[0];
    var nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  function hrTimeToNanoseconds(time) {
    return time[0] * SECOND_TO_NANOSECONDS + time[1];
  }
  function isTimeInputHrTime(value) {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  function addHrTimes(time1, time2) {
    var out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }

  // node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode;
  (function(ExportResultCode2) {
    ExportResultCode2[ExportResultCode2["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode2[ExportResultCode2["FAILED"] = 1] = "FAILED";
  })(ExportResultCode || (ExportResultCode = {}));

  // node_modules/@opentelemetry/core/build/esm/propagation/composite.js
  var __values3 = function(o2) {
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
  var CompositePropagator = (
    /** @class */
    function() {
      function CompositePropagator2(config) {
        if (config === void 0) {
          config = {};
        }
        var _a3;
        this._propagators = (_a3 = config.propagators) !== null && _a3 !== void 0 ? _a3 : [];
        this._fields = Array.from(new Set(this._propagators.map(function(p2) {
          return typeof p2.fields === "function" ? p2.fields() : [];
        }).reduce(function(x2, y2) {
          return x2.concat(y2);
        }, [])));
      }
      CompositePropagator2.prototype.inject = function(context2, carrier, setter) {
        var e_1, _a3;
        try {
          for (var _b = __values3(this._propagators), _c = _b.next(); !_c.done; _c = _b.next()) {
            var propagator = _c.value;
            try {
              propagator.inject(context2, carrier, setter);
            } catch (err) {
              diag2.warn("Failed to inject with " + propagator.constructor.name + ". Err: " + err.message);
            }
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      };
      CompositePropagator2.prototype.extract = function(context2, carrier, getter) {
        return this._propagators.reduce(function(ctx, propagator) {
          try {
            return propagator.extract(ctx, carrier, getter);
          } catch (err) {
            diag2.warn("Failed to extract with " + propagator.constructor.name + ". Err: " + err.message);
          }
          return ctx;
        }, context2);
      };
      CompositePropagator2.prototype.fields = function() {
        return this._fields.slice();
      };
      return CompositePropagator2;
    }()
  );

  // node_modules/@opentelemetry/core/build/esm/internal/validators.js
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
  var VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
  var VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
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
  var TraceState = (
    /** @class */
    function() {
      function TraceState2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceState2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceState2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceState2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceState2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceState2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i2 = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i2 !== -1) {
            var key = listMember.slice(0, i2);
            var value = listMember.slice(i2 + 1, part.length);
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
      };
      TraceState2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceState2.prototype._clone = function() {
        var traceState = new TraceState2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceState2;
    }()
  );

  // node_modules/@opentelemetry/core/build/esm/trace/W3CTraceContextPropagator.js
  var TRACE_PARENT_HEADER = "traceparent";
  var TRACE_STATE_HEADER = "tracestate";
  var VERSION3 = "00";
  var VERSION_PART = "(?!ff)[\\da-f]{2}";
  var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
  var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
  var FLAGS_PART = "[\\da-f]{2}";
  var TRACE_PARENT_REGEX = new RegExp("^\\s?(" + VERSION_PART + ")-(" + TRACE_ID_PART + ")-(" + PARENT_ID_PART + ")-(" + FLAGS_PART + ")(-.*)?\\s?$");
  function parseTraceParent(traceParent) {
    var match = TRACE_PARENT_REGEX.exec(traceParent);
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
  var W3CTraceContextPropagator = (
    /** @class */
    function() {
      function W3CTraceContextPropagator2() {
      }
      W3CTraceContextPropagator2.prototype.inject = function(context2, carrier, setter) {
        var spanContext = trace.getSpanContext(context2);
        if (!spanContext || isTracingSuppressed(context2) || !isSpanContextValid(spanContext))
          return;
        var traceParent = VERSION3 + "-" + spanContext.traceId + "-" + spanContext.spanId + "-0" + Number(spanContext.traceFlags || TraceFlags.NONE).toString(16);
        setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
        if (spanContext.traceState) {
          setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
        }
      };
      W3CTraceContextPropagator2.prototype.extract = function(context2, carrier, getter) {
        var traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
        if (!traceParentHeader)
          return context2;
        var traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
        if (typeof traceParent !== "string")
          return context2;
        var spanContext = parseTraceParent(traceParent);
        if (!spanContext)
          return context2;
        spanContext.isRemote = true;
        var traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
        if (traceStateHeader) {
          var state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
          spanContext.traceState = new TraceState(typeof state === "string" ? state : void 0);
        }
        return trace.setSpanContext(context2, spanContext);
      };
      W3CTraceContextPropagator2.prototype.fields = function() {
        return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
      };
      return W3CTraceContextPropagator2;
    }()
  );

  // node_modules/@opentelemetry/core/build/esm/utils/lodash.merge.js
  var objectTag = "[object Object]";
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  var objectCtorString = funcToString.call(Object);
  var getPrototype = overArg(Object.getPrototypeOf, Object);
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  var nativeObjectToString = objectProto.toString;
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) !== objectTag) {
      return false;
    }
    var proto = getPrototype(value);
    if (proto === null) {
      return true;
    }
    var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
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
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    var unmasked = false;
    try {
      value[symToStringTag] = void 0;
      unmasked = true;
    } catch (e2) {
    }
    var result = nativeObjectToString.call(value);
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
  function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var result = args.shift();
    var objects = /* @__PURE__ */ new WeakMap();
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
  function mergeTwoObjects(one, two, level, objects) {
    if (level === void 0) {
      level = 0;
    }
    var result;
    if (level > MAX_LEVEL) {
      return void 0;
    }
    level++;
    if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) {
      result = takeValue(two);
    } else if (isArray(one)) {
      result = one.slice();
      if (isArray(two)) {
        for (var i2 = 0, j2 = two.length; i2 < j2; i2++) {
          result.push(takeValue(two[i2]));
        }
      } else if (isObject(two)) {
        var keys = Object.keys(two);
        for (var i2 = 0, j2 = keys.length; i2 < j2; i2++) {
          var key = keys[i2];
          result[key] = takeValue(two[key]);
        }
      }
    } else if (isObject(one)) {
      if (isObject(two)) {
        if (!shouldMerge(one, two)) {
          return two;
        }
        result = Object.assign({}, one);
        var keys = Object.keys(two);
        for (var i2 = 0, j2 = keys.length; i2 < j2; i2++) {
          var key = keys[i2];
          var twoValue = two[key];
          if (isPrimitive(twoValue)) {
            if (typeof twoValue === "undefined") {
              delete result[key];
            } else {
              result[key] = twoValue;
            }
          } else {
            var obj1 = result[key];
            var obj2 = twoValue;
            if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects)) {
              delete result[key];
            } else {
              if (isObject(obj1) && isObject(obj2)) {
                var arr1 = objects.get(obj1) || [];
                var arr2 = objects.get(obj2) || [];
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
    var arr = objects.get(obj[key]) || [];
    for (var i2 = 0, j2 = arr.length; i2 < j2; i2++) {
      var info = arr[i2];
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

  // node_modules/@opentelemetry/core/build/esm/utils/url.js
  var __values4 = function(o2) {
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
  function urlMatches(url, urlToMatch) {
    if (typeof urlToMatch === "string") {
      return url === urlToMatch;
    } else {
      return !!url.match(urlToMatch);
    }
  }
  function isUrlIgnored(url, ignoredUrls) {
    var e_1, _a3;
    if (!ignoredUrls) {
      return false;
    }
    try {
      for (var ignoredUrls_1 = __values4(ignoredUrls), ignoredUrls_1_1 = ignoredUrls_1.next(); !ignoredUrls_1_1.done; ignoredUrls_1_1 = ignoredUrls_1.next()) {
        var ignoreUrl = ignoredUrls_1_1.value;
        if (urlMatches(url, ignoreUrl)) {
          return true;
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (ignoredUrls_1_1 && !ignoredUrls_1_1.done && (_a3 = ignoredUrls_1.return)) _a3.call(ignoredUrls_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return false;
  }

  // node_modules/@opentelemetry/core/build/esm/utils/promise.js
  var Deferred = (
    /** @class */
    function() {
      function Deferred2() {
        var _this = this;
        this._promise = new Promise(function(resolve, reject) {
          _this._resolve = resolve;
          _this._reject = reject;
        });
      }
      Object.defineProperty(Deferred2.prototype, "promise", {
        get: function() {
          return this._promise;
        },
        enumerable: false,
        configurable: true
      });
      Deferred2.prototype.resolve = function(val) {
        this._resolve(val);
      };
      Deferred2.prototype.reject = function(err) {
        this._reject(err);
      };
      return Deferred2;
    }()
  );

  // node_modules/@opentelemetry/core/build/esm/utils/callback.js
  var __read8 = function(o2, n2) {
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
  var __spreadArray5 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var BindOnceFuture = (
    /** @class */
    function() {
      function BindOnceFuture2(_callback, _that) {
        this._callback = _callback;
        this._that = _that;
        this._isCalled = false;
        this._deferred = new Deferred();
      }
      Object.defineProperty(BindOnceFuture2.prototype, "isCalled", {
        get: function() {
          return this._isCalled;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BindOnceFuture2.prototype, "promise", {
        get: function() {
          return this._deferred.promise;
        },
        enumerable: false,
        configurable: true
      });
      BindOnceFuture2.prototype.call = function() {
        var _a3;
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        if (!this._isCalled) {
          this._isCalled = true;
          try {
            Promise.resolve((_a3 = this._callback).call.apply(_a3, __spreadArray5([this._that], __read8(args), false))).then(function(val) {
              return _this._deferred.resolve(val);
            }, function(err) {
              return _this._deferred.reject(err);
            });
          } catch (err) {
            this._deferred.reject(err);
          }
        }
        return this._deferred.promise;
      };
      return BindOnceFuture2;
    }()
  );

  // node_modules/@opentelemetry/resources/build/esm/platform/browser/default-service-name.js
  function defaultServiceName() {
    return "unknown_service";
  }

  // node_modules/@opentelemetry/resources/build/esm/Resource.js
  var __assign2 = function() {
    __assign2 = Object.assign || function(t3) {
      for (var s2, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
        s2 = arguments[i2];
        for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2))
          t3[p2] = s2[p2];
      }
      return t3;
    };
    return __assign2.apply(this, arguments);
  };
  var __awaiter = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var __read9 = function(o2, n2) {
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
  var Resource = (
    /** @class */
    function() {
      function Resource2(attributes, asyncAttributesPromise) {
        var _this = this;
        var _a3;
        this._attributes = attributes;
        this.asyncAttributesPending = asyncAttributesPromise != null;
        this._syncAttributes = (_a3 = this._attributes) !== null && _a3 !== void 0 ? _a3 : {};
        this._asyncAttributesPromise = asyncAttributesPromise === null || asyncAttributesPromise === void 0 ? void 0 : asyncAttributesPromise.then(function(asyncAttributes) {
          _this._attributes = Object.assign({}, _this._attributes, asyncAttributes);
          _this.asyncAttributesPending = false;
          return asyncAttributes;
        }, function(err) {
          diag2.debug("a resource's async attributes promise rejected: %s", err);
          _this.asyncAttributesPending = false;
          return {};
        });
      }
      Resource2.empty = function() {
        return Resource2.EMPTY;
      };
      Resource2.default = function() {
        var _a3;
        return new Resource2((_a3 = {}, _a3[SEMRESATTRS_SERVICE_NAME] = defaultServiceName(), _a3[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE], _a3[SEMRESATTRS_TELEMETRY_SDK_NAME] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_NAME], _a3[SEMRESATTRS_TELEMETRY_SDK_VERSION] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_VERSION], _a3));
      };
      Object.defineProperty(Resource2.prototype, "attributes", {
        get: function() {
          var _a3;
          if (this.asyncAttributesPending) {
            diag2.error("Accessing resource attributes before async attributes settled");
          }
          return (_a3 = this._attributes) !== null && _a3 !== void 0 ? _a3 : {};
        },
        enumerable: false,
        configurable: true
      });
      Resource2.prototype.waitForAsyncAttributes = function() {
        return __awaiter(this, void 0, void 0, function() {
          return __generator(this, function(_a3) {
            switch (_a3.label) {
              case 0:
                if (!this.asyncAttributesPending) return [3, 2];
                return [4, this._asyncAttributesPromise];
              case 1:
                _a3.sent();
                _a3.label = 2;
              case 2:
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      Resource2.prototype.merge = function(other) {
        var _this = this;
        var _a3;
        if (!other)
          return this;
        var mergedSyncAttributes = __assign2(__assign2({}, this._syncAttributes), (_a3 = other._syncAttributes) !== null && _a3 !== void 0 ? _a3 : other.attributes);
        if (!this._asyncAttributesPromise && !other._asyncAttributesPromise) {
          return new Resource2(mergedSyncAttributes);
        }
        var mergedAttributesPromise = Promise.all([
          this._asyncAttributesPromise,
          other._asyncAttributesPromise
        ]).then(function(_a4) {
          var _b;
          var _c = __read9(_a4, 2), thisAsyncAttributes = _c[0], otherAsyncAttributes = _c[1];
          return __assign2(__assign2(__assign2(__assign2({}, _this._syncAttributes), thisAsyncAttributes), (_b = other._syncAttributes) !== null && _b !== void 0 ? _b : other.attributes), otherAsyncAttributes);
        });
        return new Resource2(mergedSyncAttributes, mergedAttributesPromise);
      };
      Resource2.EMPTY = new Resource2({});
      return Resource2;
    }()
  );

  // node_modules/@opentelemetry/resources/build/esm/utils.js
  var isPromiseLike = function(val) {
    return val !== null && typeof val === "object" && typeof val.then === "function";
  };

  // node_modules/@opentelemetry/resources/build/esm/detect-resources.js
  var __awaiter2 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator2 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var detectResourcesSync = function(config) {
    var _a3;
    if (config === void 0) {
      config = {};
    }
    var resources = ((_a3 = config.detectors) !== null && _a3 !== void 0 ? _a3 : []).map(function(d2) {
      try {
        var resourceOrPromise_1 = d2.detect(config);
        var resource_1;
        if (isPromiseLike(resourceOrPromise_1)) {
          var createPromise = function() {
            return __awaiter2(void 0, void 0, void 0, function() {
              var resolvedResource;
              var _a4;
              return __generator2(this, function(_b) {
                switch (_b.label) {
                  case 0:
                    return [4, resourceOrPromise_1];
                  case 1:
                    resolvedResource = _b.sent();
                    return [4, (_a4 = resolvedResource.waitForAsyncAttributes) === null || _a4 === void 0 ? void 0 : _a4.call(resolvedResource)];
                  case 2:
                    _b.sent();
                    return [2, resolvedResource.attributes];
                }
              });
            });
          };
          resource_1 = new Resource({}, createPromise());
        } else {
          resource_1 = resourceOrPromise_1;
        }
        if (resource_1.waitForAsyncAttributes) {
          void resource_1.waitForAsyncAttributes().then(function() {
            return diag2.debug(d2.constructor.name + " found resource.", resource_1);
          });
        } else {
          diag2.debug(d2.constructor.name + " found resource.", resource_1);
        }
        return resource_1;
      } catch (e2) {
        diag2.error(d2.constructor.name + " failed: " + e2.message);
        return Resource.empty();
      }
    });
    var mergedResources = resources.reduce(function(acc, resource) {
      return acc.merge(resource);
    }, Resource.empty());
    if (mergedResources.waitForAsyncAttributes) {
      void mergedResources.waitForAsyncAttributes().then(function() {
        logResources(resources);
      });
    }
    return mergedResources;
  };
  var logResources = function(resources) {
    resources.forEach(function(resource) {
      if (Object.keys(resource.attributes).length > 0) {
        var resourceDebugString = JSON.stringify(resource.attributes, null, 4);
        diag2.verbose(resourceDebugString);
      }
    });
  };

  // node_modules/@opentelemetry/sdk-trace-base/node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_EXCEPTION_TYPE = "exception.type";
  var TMP_EXCEPTION_MESSAGE = "exception.message";
  var TMP_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var SEMATTRS_EXCEPTION_TYPE = TMP_EXCEPTION_TYPE;
  var SEMATTRS_EXCEPTION_MESSAGE = TMP_EXCEPTION_MESSAGE;
  var SEMATTRS_EXCEPTION_STACKTRACE = TMP_EXCEPTION_STACKTRACE;

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/enums.js
  var ExceptionEventName = "exception";

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Span.js
  var __assign3 = function() {
    __assign3 = Object.assign || function(t3) {
      for (var s2, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
        s2 = arguments[i2];
        for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2))
          t3[p2] = s2[p2];
      }
      return t3;
    };
    return __assign3.apply(this, arguments);
  };
  var __values5 = function(o2) {
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
  var __read10 = function(o2, n2) {
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
  var __spreadArray6 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var Span = (
    /** @class */
    function() {
      function Span2(parentTracer, context2, spanName, spanContext, kind, parentSpanId, links, startTime, _deprecatedClock, attributes) {
        if (links === void 0) {
          links = [];
        }
        this.attributes = {};
        this.links = [];
        this.events = [];
        this._droppedAttributesCount = 0;
        this._droppedEventsCount = 0;
        this._droppedLinksCount = 0;
        this.status = {
          code: SpanStatusCode.UNSET
        };
        this.endTime = [0, 0];
        this._ended = false;
        this._duration = [-1, -1];
        this.name = spanName;
        this._spanContext = spanContext;
        this.parentSpanId = parentSpanId;
        this.kind = kind;
        this.links = links;
        var now = Date.now();
        this._performanceStartTime = otperformance.now();
        this._performanceOffset = now - (this._performanceStartTime + getTimeOrigin());
        this._startTimeProvided = startTime != null;
        this.startTime = this._getTime(startTime !== null && startTime !== void 0 ? startTime : now);
        this.resource = parentTracer.resource;
        this.instrumentationLibrary = parentTracer.instrumentationLibrary;
        this._spanLimits = parentTracer.getSpanLimits();
        this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
        if (attributes != null) {
          this.setAttributes(attributes);
        }
        this._spanProcessor = parentTracer.getActiveSpanProcessor();
        this._spanProcessor.onStart(this, context2);
      }
      Span2.prototype.spanContext = function() {
        return this._spanContext;
      };
      Span2.prototype.setAttribute = function(key, value) {
        if (value == null || this._isSpanEnded())
          return this;
        if (key.length === 0) {
          diag2.warn("Invalid attribute key: " + key);
          return this;
        }
        if (!isAttributeValue(value)) {
          diag2.warn("Invalid attribute value set for key: " + key);
          return this;
        }
        if (Object.keys(this.attributes).length >= this._spanLimits.attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
          this._droppedAttributesCount++;
          return this;
        }
        this.attributes[key] = this._truncateToSize(value);
        return this;
      };
      Span2.prototype.setAttributes = function(attributes) {
        var e_1, _a3;
        try {
          for (var _b = __values5(Object.entries(attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read10(_c.value, 2), k2 = _d[0], v2 = _d[1];
            this.setAttribute(k2, v2);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return this;
      };
      Span2.prototype.addEvent = function(name, attributesOrStartTime, timeStamp) {
        if (this._isSpanEnded())
          return this;
        if (this._spanLimits.eventCountLimit === 0) {
          diag2.warn("No events allowed.");
          this._droppedEventsCount++;
          return this;
        }
        if (this.events.length >= this._spanLimits.eventCountLimit) {
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
        var attributes = sanitizeAttributes(attributesOrStartTime);
        this.events.push({
          name,
          attributes,
          time: this._getTime(timeStamp),
          droppedAttributesCount: 0
        });
        return this;
      };
      Span2.prototype.addLink = function(link) {
        this.links.push(link);
        return this;
      };
      Span2.prototype.addLinks = function(links) {
        var _a3;
        (_a3 = this.links).push.apply(_a3, __spreadArray6([], __read10(links), false));
        return this;
      };
      Span2.prototype.setStatus = function(status) {
        if (this._isSpanEnded())
          return this;
        this.status = __assign3({}, status);
        if (this.status.message != null && typeof status.message !== "string") {
          diag2.warn("Dropping invalid status.message of type '" + typeof status.message + "', expected 'string'");
          delete this.status.message;
        }
        return this;
      };
      Span2.prototype.updateName = function(name) {
        if (this._isSpanEnded())
          return this;
        this.name = name;
        return this;
      };
      Span2.prototype.end = function(endTime) {
        if (this._isSpanEnded()) {
          diag2.error(this.name + " " + this._spanContext.traceId + "-" + this._spanContext.spanId + " - You can only call end() on a span once.");
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
          diag2.warn("Dropped " + this._droppedEventsCount + " events because eventCountLimit reached");
        }
        this._spanProcessor.onEnd(this);
      };
      Span2.prototype._getTime = function(inp) {
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
        var msDuration = otperformance.now() - this._performanceStartTime;
        return addHrTimes(this.startTime, millisToHrTime(msDuration));
      };
      Span2.prototype.isRecording = function() {
        return this._ended === false;
      };
      Span2.prototype.recordException = function(exception, time) {
        var attributes = {};
        if (typeof exception === "string") {
          attributes[SEMATTRS_EXCEPTION_MESSAGE] = exception;
        } else if (exception) {
          if (exception.code) {
            attributes[SEMATTRS_EXCEPTION_TYPE] = exception.code.toString();
          } else if (exception.name) {
            attributes[SEMATTRS_EXCEPTION_TYPE] = exception.name;
          }
          if (exception.message) {
            attributes[SEMATTRS_EXCEPTION_MESSAGE] = exception.message;
          }
          if (exception.stack) {
            attributes[SEMATTRS_EXCEPTION_STACKTRACE] = exception.stack;
          }
        }
        if (attributes[SEMATTRS_EXCEPTION_TYPE] || attributes[SEMATTRS_EXCEPTION_MESSAGE]) {
          this.addEvent(ExceptionEventName, attributes, time);
        } else {
          diag2.warn("Failed to record an exception " + exception);
        }
      };
      Object.defineProperty(Span2.prototype, "duration", {
        get: function() {
          return this._duration;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "ended", {
        get: function() {
          return this._ended;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedAttributesCount", {
        get: function() {
          return this._droppedAttributesCount;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedEventsCount", {
        get: function() {
          return this._droppedEventsCount;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedLinksCount", {
        get: function() {
          return this._droppedLinksCount;
        },
        enumerable: false,
        configurable: true
      });
      Span2.prototype._isSpanEnded = function() {
        if (this._ended) {
          diag2.warn("Can not execute the operation on ended Span {traceId: " + this._spanContext.traceId + ", spanId: " + this._spanContext.spanId + "}");
        }
        return this._ended;
      };
      Span2.prototype._truncateToLimitUtil = function(value, limit) {
        if (value.length <= limit) {
          return value;
        }
        return value.substring(0, limit);
      };
      Span2.prototype._truncateToSize = function(value) {
        var _this = this;
        var limit = this._attributeValueLengthLimit;
        if (limit <= 0) {
          diag2.warn("Attribute value limit must be positive, got " + limit);
          return value;
        }
        if (typeof value === "string") {
          return this._truncateToLimitUtil(value, limit);
        }
        if (Array.isArray(value)) {
          return value.map(function(val) {
            return typeof val === "string" ? _this._truncateToLimitUtil(val, limit) : val;
          });
        }
        return value;
      };
      return Span2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Sampler.js
  var SamplingDecision2;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision2 || (SamplingDecision2 = {}));

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOffSampler.js
  var AlwaysOffSampler = (
    /** @class */
    function() {
      function AlwaysOffSampler2() {
      }
      AlwaysOffSampler2.prototype.shouldSample = function() {
        return {
          decision: SamplingDecision2.NOT_RECORD
        };
      };
      AlwaysOffSampler2.prototype.toString = function() {
        return "AlwaysOffSampler";
      };
      return AlwaysOffSampler2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
  var AlwaysOnSampler = (
    /** @class */
    function() {
      function AlwaysOnSampler2() {
      }
      AlwaysOnSampler2.prototype.shouldSample = function() {
        return {
          decision: SamplingDecision2.RECORD_AND_SAMPLED
        };
      };
      AlwaysOnSampler2.prototype.toString = function() {
        return "AlwaysOnSampler";
      };
      return AlwaysOnSampler2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/ParentBasedSampler.js
  var ParentBasedSampler = (
    /** @class */
    function() {
      function ParentBasedSampler2(config) {
        var _a3, _b, _c, _d;
        this._root = config.root;
        if (!this._root) {
          globalErrorHandler(new Error("ParentBasedSampler must have a root sampler configured"));
          this._root = new AlwaysOnSampler();
        }
        this._remoteParentSampled = (_a3 = config.remoteParentSampled) !== null && _a3 !== void 0 ? _a3 : new AlwaysOnSampler();
        this._remoteParentNotSampled = (_b = config.remoteParentNotSampled) !== null && _b !== void 0 ? _b : new AlwaysOffSampler();
        this._localParentSampled = (_c = config.localParentSampled) !== null && _c !== void 0 ? _c : new AlwaysOnSampler();
        this._localParentNotSampled = (_d = config.localParentNotSampled) !== null && _d !== void 0 ? _d : new AlwaysOffSampler();
      }
      ParentBasedSampler2.prototype.shouldSample = function(context2, traceId, spanName, spanKind, attributes, links) {
        var parentContext = trace.getSpanContext(context2);
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
      };
      ParentBasedSampler2.prototype.toString = function() {
        return "ParentBased{root=" + this._root.toString() + ", remoteParentSampled=" + this._remoteParentSampled.toString() + ", remoteParentNotSampled=" + this._remoteParentNotSampled.toString() + ", localParentSampled=" + this._localParentSampled.toString() + ", localParentNotSampled=" + this._localParentNotSampled.toString() + "}";
      };
      return ParentBasedSampler2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/TraceIdRatioBasedSampler.js
  var TraceIdRatioBasedSampler = (
    /** @class */
    function() {
      function TraceIdRatioBasedSampler2(_ratio) {
        if (_ratio === void 0) {
          _ratio = 0;
        }
        this._ratio = _ratio;
        this._ratio = this._normalize(_ratio);
        this._upperBound = Math.floor(this._ratio * 4294967295);
      }
      TraceIdRatioBasedSampler2.prototype.shouldSample = function(context2, traceId) {
        return {
          decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound ? SamplingDecision2.RECORD_AND_SAMPLED : SamplingDecision2.NOT_RECORD
        };
      };
      TraceIdRatioBasedSampler2.prototype.toString = function() {
        return "TraceIdRatioBased{" + this._ratio + "}";
      };
      TraceIdRatioBasedSampler2.prototype._normalize = function(ratio) {
        if (typeof ratio !== "number" || isNaN(ratio))
          return 0;
        return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
      };
      TraceIdRatioBasedSampler2.prototype._accumulate = function(traceId) {
        var accumulation = 0;
        for (var i2 = 0; i2 < traceId.length / 8; i2++) {
          var pos = i2 * 8;
          var part = parseInt(traceId.slice(pos, pos + 8), 16);
          accumulation = (accumulation ^ part) >>> 0;
        }
        return accumulation;
      };
      return TraceIdRatioBasedSampler2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/config.js
  var FALLBACK_OTEL_TRACES_SAMPLER = TracesSamplerValues.AlwaysOn;
  var DEFAULT_RATIO = 1;
  function loadDefaultConfig() {
    var env = getEnv();
    return {
      sampler: buildSamplerFromEnv(env),
      forceFlushTimeoutMillis: 3e4,
      generalLimits: {
        attributeValueLengthLimit: env.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT,
        attributeCountLimit: env.OTEL_ATTRIBUTE_COUNT_LIMIT
      },
      spanLimits: {
        attributeValueLengthLimit: env.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT,
        attributeCountLimit: env.OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT,
        linkCountLimit: env.OTEL_SPAN_LINK_COUNT_LIMIT,
        eventCountLimit: env.OTEL_SPAN_EVENT_COUNT_LIMIT,
        attributePerEventCountLimit: env.OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
        attributePerLinkCountLimit: env.OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT
      },
      mergeResourceWithDefaults: true
    };
  }
  function buildSamplerFromEnv(environment) {
    if (environment === void 0) {
      environment = getEnv();
    }
    switch (environment.OTEL_TRACES_SAMPLER) {
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
        return new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv(environment));
      case TracesSamplerValues.ParentBasedTraceIdRatio:
        return new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv(environment))
        });
      default:
        diag2.error('OTEL_TRACES_SAMPLER value "' + environment.OTEL_TRACES_SAMPLER + " invalid, defaulting to " + FALLBACK_OTEL_TRACES_SAMPLER + '".');
        return new AlwaysOnSampler();
    }
  }
  function getSamplerProbabilityFromEnv(environment) {
    if (environment.OTEL_TRACES_SAMPLER_ARG === void 0 || environment.OTEL_TRACES_SAMPLER_ARG === "") {
      diag2.error("OTEL_TRACES_SAMPLER_ARG is blank, defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    var probability = Number(environment.OTEL_TRACES_SAMPLER_ARG);
    if (isNaN(probability)) {
      diag2.error("OTEL_TRACES_SAMPLER_ARG=" + environment.OTEL_TRACES_SAMPLER_ARG + " was given, but it is invalid, defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    if (probability < 0 || probability > 1) {
      diag2.error("OTEL_TRACES_SAMPLER_ARG=" + environment.OTEL_TRACES_SAMPLER_ARG + " was given, but it is out of range ([0..1]), defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    return probability;
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/utility.js
  function mergeConfig(userConfig) {
    var perInstanceDefaults = {
      sampler: buildSamplerFromEnv()
    };
    var DEFAULT_CONFIG = loadDefaultConfig();
    var target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
    target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
    target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
    return target;
  }
  function reconfigureLimits(userConfig) {
    var _a3, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var spanLimits = Object.assign({}, userConfig.spanLimits);
    var parsedEnvConfig = getEnvWithoutDefaults();
    spanLimits.attributeCountLimit = (_f = (_e = (_d = (_b = (_a3 = userConfig.spanLimits) === null || _a3 === void 0 ? void 0 : _a3.attributeCountLimit) !== null && _b !== void 0 ? _b : (_c = userConfig.generalLimits) === null || _c === void 0 ? void 0 : _c.attributeCountLimit) !== null && _d !== void 0 ? _d : parsedEnvConfig.OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT) !== null && _e !== void 0 ? _e : parsedEnvConfig.OTEL_ATTRIBUTE_COUNT_LIMIT) !== null && _f !== void 0 ? _f : DEFAULT_ATTRIBUTE_COUNT_LIMIT;
    spanLimits.attributeValueLengthLimit = (_m = (_l = (_k = (_h = (_g = userConfig.spanLimits) === null || _g === void 0 ? void 0 : _g.attributeValueLengthLimit) !== null && _h !== void 0 ? _h : (_j = userConfig.generalLimits) === null || _j === void 0 ? void 0 : _j.attributeValueLengthLimit) !== null && _k !== void 0 ? _k : parsedEnvConfig.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _l !== void 0 ? _l : parsedEnvConfig.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _m !== void 0 ? _m : DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
    return Object.assign({}, userConfig, { spanLimits });
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/export/BatchSpanProcessorBase.js
  var BatchSpanProcessorBase = (
    /** @class */
    function() {
      function BatchSpanProcessorBase2(_exporter, config) {
        this._exporter = _exporter;
        this._isExporting = false;
        this._finishedSpans = [];
        this._droppedSpansCount = 0;
        var env = getEnv();
        this._maxExportBatchSize = typeof (config === null || config === void 0 ? void 0 : config.maxExportBatchSize) === "number" ? config.maxExportBatchSize : env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE;
        this._maxQueueSize = typeof (config === null || config === void 0 ? void 0 : config.maxQueueSize) === "number" ? config.maxQueueSize : env.OTEL_BSP_MAX_QUEUE_SIZE;
        this._scheduledDelayMillis = typeof (config === null || config === void 0 ? void 0 : config.scheduledDelayMillis) === "number" ? config.scheduledDelayMillis : env.OTEL_BSP_SCHEDULE_DELAY;
        this._exportTimeoutMillis = typeof (config === null || config === void 0 ? void 0 : config.exportTimeoutMillis) === "number" ? config.exportTimeoutMillis : env.OTEL_BSP_EXPORT_TIMEOUT;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
          diag2.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
          this._maxExportBatchSize = this._maxQueueSize;
        }
      }
      BatchSpanProcessorBase2.prototype.forceFlush = function() {
        if (this._shutdownOnce.isCalled) {
          return this._shutdownOnce.promise;
        }
        return this._flushAll();
      };
      BatchSpanProcessorBase2.prototype.onStart = function(_span, _parentContext) {
      };
      BatchSpanProcessorBase2.prototype.onEnd = function(span) {
        if (this._shutdownOnce.isCalled) {
          return;
        }
        if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
          return;
        }
        this._addToBuffer(span);
      };
      BatchSpanProcessorBase2.prototype.shutdown = function() {
        return this._shutdownOnce.call();
      };
      BatchSpanProcessorBase2.prototype._shutdown = function() {
        var _this = this;
        return Promise.resolve().then(function() {
          return _this.onShutdown();
        }).then(function() {
          return _this._flushAll();
        }).then(function() {
          return _this._exporter.shutdown();
        });
      };
      BatchSpanProcessorBase2.prototype._addToBuffer = function(span) {
        if (this._finishedSpans.length >= this._maxQueueSize) {
          if (this._droppedSpansCount === 0) {
            diag2.debug("maxQueueSize reached, dropping spans");
          }
          this._droppedSpansCount++;
          return;
        }
        if (this._droppedSpansCount > 0) {
          diag2.warn("Dropped " + this._droppedSpansCount + " spans because maxQueueSize reached");
          this._droppedSpansCount = 0;
        }
        this._finishedSpans.push(span);
        this._maybeStartTimer();
      };
      BatchSpanProcessorBase2.prototype._flushAll = function() {
        var _this = this;
        return new Promise(function(resolve, reject) {
          var promises = [];
          var count = Math.ceil(_this._finishedSpans.length / _this._maxExportBatchSize);
          for (var i2 = 0, j2 = count; i2 < j2; i2++) {
            promises.push(_this._flushOneBatch());
          }
          Promise.all(promises).then(function() {
            resolve();
          }).catch(reject);
        });
      };
      BatchSpanProcessorBase2.prototype._flushOneBatch = function() {
        var _this = this;
        this._clearTimer();
        if (this._finishedSpans.length === 0) {
          return Promise.resolve();
        }
        return new Promise(function(resolve, reject) {
          var timer = setTimeout(function() {
            reject(new Error("Timeout"));
          }, _this._exportTimeoutMillis);
          context.with(suppressTracing(context.active()), function() {
            var spans;
            if (_this._finishedSpans.length <= _this._maxExportBatchSize) {
              spans = _this._finishedSpans;
              _this._finishedSpans = [];
            } else {
              spans = _this._finishedSpans.splice(0, _this._maxExportBatchSize);
            }
            var doExport = function() {
              return _this._exporter.export(spans, function(result) {
                var _a3;
                clearTimeout(timer);
                if (result.code === ExportResultCode.SUCCESS) {
                  resolve();
                } else {
                  reject((_a3 = result.error) !== null && _a3 !== void 0 ? _a3 : new Error("BatchSpanProcessor: span export failed"));
                }
              });
            };
            var pendingResources = null;
            for (var i2 = 0, len = spans.length; i2 < len; i2++) {
              var span = spans[i2];
              if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
                pendingResources !== null && pendingResources !== void 0 ? pendingResources : pendingResources = [];
                pendingResources.push(span.resource.waitForAsyncAttributes());
              }
            }
            if (pendingResources === null) {
              doExport();
            } else {
              Promise.all(pendingResources).then(doExport, function(err) {
                globalErrorHandler(err);
                reject(err);
              });
            }
          });
        });
      };
      BatchSpanProcessorBase2.prototype._maybeStartTimer = function() {
        var _this = this;
        if (this._isExporting)
          return;
        var flush = function() {
          _this._isExporting = true;
          _this._flushOneBatch().finally(function() {
            _this._isExporting = false;
            if (_this._finishedSpans.length > 0) {
              _this._clearTimer();
              _this._maybeStartTimer();
            }
          }).catch(function(e2) {
            _this._isExporting = false;
            globalErrorHandler(e2);
          });
        };
        if (this._finishedSpans.length >= this._maxExportBatchSize) {
          return flush();
        }
        if (this._timer !== void 0)
          return;
        this._timer = setTimeout(function() {
          return flush();
        }, this._scheduledDelayMillis);
        unrefTimer(this._timer);
      };
      BatchSpanProcessorBase2.prototype._clearTimer = function() {
        if (this._timer !== void 0) {
          clearTimeout(this._timer);
          this._timer = void 0;
        }
      };
      return BatchSpanProcessorBase2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/export/BatchSpanProcessor.js
  var __extends3 = /* @__PURE__ */ function() {
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
  var BatchSpanProcessor = (
    /** @class */
    function(_super) {
      __extends3(BatchSpanProcessor2, _super);
      function BatchSpanProcessor2(_exporter, config) {
        var _this = _super.call(this, _exporter, config) || this;
        _this.onInit(config);
        return _this;
      }
      BatchSpanProcessor2.prototype.onInit = function(config) {
        var _this = this;
        if ((config === null || config === void 0 ? void 0 : config.disableAutoFlushOnDocumentHide) !== true && typeof document !== "undefined") {
          this._visibilityChangeListener = function() {
            if (document.visibilityState === "hidden") {
              _this.forceFlush().catch(function(error) {
                globalErrorHandler(error);
              });
            }
          };
          this._pageHideListener = function() {
            _this.forceFlush().catch(function(error) {
              globalErrorHandler(error);
            });
          };
          document.addEventListener("visibilitychange", this._visibilityChangeListener);
          document.addEventListener("pagehide", this._pageHideListener);
        }
      };
      BatchSpanProcessor2.prototype.onShutdown = function() {
        if (typeof document !== "undefined") {
          if (this._visibilityChangeListener) {
            document.removeEventListener("visibilitychange", this._visibilityChangeListener);
          }
          if (this._pageHideListener) {
            document.removeEventListener("pagehide", this._pageHideListener);
          }
        }
      };
      return BatchSpanProcessor2;
    }(BatchSpanProcessorBase)
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/RandomIdGenerator.js
  var SPAN_ID_BYTES = 8;
  var TRACE_ID_BYTES = 16;
  var RandomIdGenerator2 = (
    /** @class */
    /* @__PURE__ */ function() {
      function RandomIdGenerator3() {
        this.generateTraceId = getIdGenerator(TRACE_ID_BYTES);
        this.generateSpanId = getIdGenerator(SPAN_ID_BYTES);
      }
      return RandomIdGenerator3;
    }()
  );
  var SHARED_CHAR_CODES_ARRAY = Array(32);
  function getIdGenerator(bytes) {
    return function generateId() {
      for (var i2 = 0; i2 < bytes * 2; i2++) {
        SHARED_CHAR_CODES_ARRAY[i2] = Math.floor(Math.random() * 16) + 48;
        if (SHARED_CHAR_CODES_ARRAY[i2] >= 58) {
          SHARED_CHAR_CODES_ARRAY[i2] += 39;
        }
      }
      return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
    };
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Tracer.js
  var Tracer = (
    /** @class */
    function() {
      function Tracer2(instrumentationLibrary, config, _tracerProvider) {
        this._tracerProvider = _tracerProvider;
        var localConfig = mergeConfig(config);
        this._sampler = localConfig.sampler;
        this._generalLimits = localConfig.generalLimits;
        this._spanLimits = localConfig.spanLimits;
        this._idGenerator = config.idGenerator || new RandomIdGenerator2();
        this.resource = _tracerProvider.resource;
        this.instrumentationLibrary = instrumentationLibrary;
      }
      Tracer2.prototype.startSpan = function(name, options, context2) {
        var _a3, _b, _c;
        if (options === void 0) {
          options = {};
        }
        if (context2 === void 0) {
          context2 = context.active();
        }
        if (options.root) {
          context2 = trace.deleteSpan(context2);
        }
        var parentSpan = trace.getSpan(context2);
        if (isTracingSuppressed(context2)) {
          diag2.debug("Instrumentation suppressed, returning Noop Span");
          var nonRecordingSpan = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
          return nonRecordingSpan;
        }
        var parentSpanContext = parentSpan === null || parentSpan === void 0 ? void 0 : parentSpan.spanContext();
        var spanId = this._idGenerator.generateSpanId();
        var traceId;
        var traceState;
        var parentSpanId;
        if (!parentSpanContext || !trace.isSpanContextValid(parentSpanContext)) {
          traceId = this._idGenerator.generateTraceId();
        } else {
          traceId = parentSpanContext.traceId;
          traceState = parentSpanContext.traceState;
          parentSpanId = parentSpanContext.spanId;
        }
        var spanKind = (_a3 = options.kind) !== null && _a3 !== void 0 ? _a3 : SpanKind.INTERNAL;
        var links = ((_b = options.links) !== null && _b !== void 0 ? _b : []).map(function(link) {
          return {
            context: link.context,
            attributes: sanitizeAttributes(link.attributes)
          };
        });
        var attributes = sanitizeAttributes(options.attributes);
        var samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
        traceState = (_c = samplingResult.traceState) !== null && _c !== void 0 ? _c : traceState;
        var traceFlags = samplingResult.decision === SamplingDecision.RECORD_AND_SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE;
        var spanContext = { traceId, spanId, traceFlags, traceState };
        if (samplingResult.decision === SamplingDecision.NOT_RECORD) {
          diag2.debug("Recording is off, propagating context in a non-recording span");
          var nonRecordingSpan = trace.wrapSpanContext(spanContext);
          return nonRecordingSpan;
        }
        var initAttributes = sanitizeAttributes(Object.assign(attributes, samplingResult.attributes));
        var span = new Span(this, context2, name, spanContext, spanKind, parentSpanId, links, options.startTime, void 0, initAttributes);
        return span;
      };
      Tracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
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
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : context.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = trace.setSpan(parentContext, span);
        return context.with(contextWithSpanSet, fn, void 0, span);
      };
      Tracer2.prototype.getGeneralLimits = function() {
        return this._generalLimits;
      };
      Tracer2.prototype.getSpanLimits = function() {
        return this._spanLimits;
      };
      Tracer2.prototype.getActiveSpanProcessor = function() {
        return this._tracerProvider.getActiveSpanProcessor();
      };
      return Tracer2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/MultiSpanProcessor.js
  var __values6 = function(o2) {
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
  var MultiSpanProcessor = (
    /** @class */
    function() {
      function MultiSpanProcessor2(_spanProcessors) {
        this._spanProcessors = _spanProcessors;
      }
      MultiSpanProcessor2.prototype.forceFlush = function() {
        var e_1, _a3;
        var promises = [];
        try {
          for (var _b = __values6(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            promises.push(spanProcessor.forceFlush());
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return new Promise(function(resolve) {
          Promise.all(promises).then(function() {
            resolve();
          }).catch(function(error) {
            globalErrorHandler(error || new Error("MultiSpanProcessor: forceFlush failed"));
            resolve();
          });
        });
      };
      MultiSpanProcessor2.prototype.onStart = function(span, context2) {
        var e_2, _a3;
        try {
          for (var _b = __values6(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            spanProcessor.onStart(span, context2);
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
      };
      MultiSpanProcessor2.prototype.onEnd = function(span) {
        var e_3, _a3;
        try {
          for (var _b = __values6(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            spanProcessor.onEnd(span);
          }
        } catch (e_3_1) {
          e_3 = { error: e_3_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_3) throw e_3.error;
          }
        }
      };
      MultiSpanProcessor2.prototype.shutdown = function() {
        var e_4, _a3;
        var promises = [];
        try {
          for (var _b = __values6(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            promises.push(spanProcessor.shutdown());
          }
        } catch (e_4_1) {
          e_4 = { error: e_4_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
          } finally {
            if (e_4) throw e_4.error;
          }
        }
        return new Promise(function(resolve, reject) {
          Promise.all(promises).then(function() {
            resolve();
          }, reject);
        });
      };
      return MultiSpanProcessor2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/export/NoopSpanProcessor.js
  var NoopSpanProcessor = (
    /** @class */
    function() {
      function NoopSpanProcessor2() {
      }
      NoopSpanProcessor2.prototype.onStart = function(_span, _context) {
      };
      NoopSpanProcessor2.prototype.onEnd = function(_span) {
      };
      NoopSpanProcessor2.prototype.shutdown = function() {
        return Promise.resolve();
      };
      NoopSpanProcessor2.prototype.forceFlush = function() {
        return Promise.resolve();
      };
      return NoopSpanProcessor2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/BasicTracerProvider.js
  var __read11 = function(o2, n2) {
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
  var __spreadArray7 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var ForceFlushState;
  (function(ForceFlushState2) {
    ForceFlushState2[ForceFlushState2["resolved"] = 0] = "resolved";
    ForceFlushState2[ForceFlushState2["timeout"] = 1] = "timeout";
    ForceFlushState2[ForceFlushState2["error"] = 2] = "error";
    ForceFlushState2[ForceFlushState2["unresolved"] = 3] = "unresolved";
  })(ForceFlushState || (ForceFlushState = {}));
  var BasicTracerProvider = (
    /** @class */
    function() {
      function BasicTracerProvider2(config) {
        if (config === void 0) {
          config = {};
        }
        var _a3, _b;
        this._registeredSpanProcessors = [];
        this._tracers = /* @__PURE__ */ new Map();
        var mergedConfig = merge({}, loadDefaultConfig(), reconfigureLimits(config));
        this.resource = (_a3 = mergedConfig.resource) !== null && _a3 !== void 0 ? _a3 : Resource.empty();
        if (mergedConfig.mergeResourceWithDefaults) {
          this.resource = Resource.default().merge(this.resource);
        }
        this._config = Object.assign({}, mergedConfig, {
          resource: this.resource
        });
        if ((_b = config.spanProcessors) === null || _b === void 0 ? void 0 : _b.length) {
          this._registeredSpanProcessors = __spreadArray7([], __read11(config.spanProcessors), false);
          this.activeSpanProcessor = new MultiSpanProcessor(this._registeredSpanProcessors);
        } else {
          var defaultExporter = this._buildExporterFromEnv();
          if (defaultExporter !== void 0) {
            var batchProcessor = new BatchSpanProcessor(defaultExporter);
            this.activeSpanProcessor = batchProcessor;
          } else {
            this.activeSpanProcessor = new NoopSpanProcessor();
          }
        }
      }
      BasicTracerProvider2.prototype.getTracer = function(name, version, options) {
        var key = name + "@" + (version || "") + ":" + ((options === null || options === void 0 ? void 0 : options.schemaUrl) || "");
        if (!this._tracers.has(key)) {
          this._tracers.set(key, new Tracer({ name, version, schemaUrl: options === null || options === void 0 ? void 0 : options.schemaUrl }, this._config, this));
        }
        return this._tracers.get(key);
      };
      BasicTracerProvider2.prototype.addSpanProcessor = function(spanProcessor) {
        if (this._registeredSpanProcessors.length === 0) {
          this.activeSpanProcessor.shutdown().catch(function(err) {
            return diag2.error("Error while trying to shutdown current span processor", err);
          });
        }
        this._registeredSpanProcessors.push(spanProcessor);
        this.activeSpanProcessor = new MultiSpanProcessor(this._registeredSpanProcessors);
      };
      BasicTracerProvider2.prototype.getActiveSpanProcessor = function() {
        return this.activeSpanProcessor;
      };
      BasicTracerProvider2.prototype.register = function(config) {
        if (config === void 0) {
          config = {};
        }
        trace.setGlobalTracerProvider(this);
        if (config.propagator === void 0) {
          config.propagator = this._buildPropagatorFromEnv();
        }
        if (config.contextManager) {
          context.setGlobalContextManager(config.contextManager);
        }
        if (config.propagator) {
          propagation.setGlobalPropagator(config.propagator);
        }
      };
      BasicTracerProvider2.prototype.forceFlush = function() {
        var timeout = this._config.forceFlushTimeoutMillis;
        var promises = this._registeredSpanProcessors.map(function(spanProcessor) {
          return new Promise(function(resolve) {
            var state;
            var timeoutInterval = setTimeout(function() {
              resolve(new Error("Span processor did not completed within timeout period of " + timeout + " ms"));
              state = ForceFlushState.timeout;
            }, timeout);
            spanProcessor.forceFlush().then(function() {
              clearTimeout(timeoutInterval);
              if (state !== ForceFlushState.timeout) {
                state = ForceFlushState.resolved;
                resolve(state);
              }
            }).catch(function(error) {
              clearTimeout(timeoutInterval);
              state = ForceFlushState.error;
              resolve(error);
            });
          });
        });
        return new Promise(function(resolve, reject) {
          Promise.all(promises).then(function(results) {
            var errors = results.filter(function(result) {
              return result !== ForceFlushState.resolved;
            });
            if (errors.length > 0) {
              reject(errors);
            } else {
              resolve();
            }
          }).catch(function(error) {
            return reject([error]);
          });
        });
      };
      BasicTracerProvider2.prototype.shutdown = function() {
        return this.activeSpanProcessor.shutdown();
      };
      BasicTracerProvider2.prototype._getPropagator = function(name) {
        var _a3;
        return (_a3 = this.constructor._registeredPropagators.get(name)) === null || _a3 === void 0 ? void 0 : _a3();
      };
      BasicTracerProvider2.prototype._getSpanExporter = function(name) {
        var _a3;
        return (_a3 = this.constructor._registeredExporters.get(name)) === null || _a3 === void 0 ? void 0 : _a3();
      };
      BasicTracerProvider2.prototype._buildPropagatorFromEnv = function() {
        var _this = this;
        var uniquePropagatorNames = Array.from(new Set(getEnv().OTEL_PROPAGATORS));
        var propagators = uniquePropagatorNames.map(function(name) {
          var propagator = _this._getPropagator(name);
          if (!propagator) {
            diag2.warn('Propagator "' + name + '" requested through environment variable is unavailable.');
          }
          return propagator;
        });
        var validPropagators = propagators.reduce(function(list, item) {
          if (item) {
            list.push(item);
          }
          return list;
        }, []);
        if (validPropagators.length === 0) {
          return;
        } else if (uniquePropagatorNames.length === 1) {
          return validPropagators[0];
        } else {
          return new CompositePropagator({
            propagators: validPropagators
          });
        }
      };
      BasicTracerProvider2.prototype._buildExporterFromEnv = function() {
        var exporterName = getEnv().OTEL_TRACES_EXPORTER;
        if (exporterName === "none" || exporterName === "")
          return;
        var exporter = this._getSpanExporter(exporterName);
        if (!exporter) {
          diag2.error('Exporter "' + exporterName + '" requested through environment variable is unavailable.');
        }
        return exporter;
      };
      BasicTracerProvider2._registeredPropagators = /* @__PURE__ */ new Map([
        ["tracecontext", function() {
          return new W3CTraceContextPropagator();
        }],
        ["baggage", function() {
          return new W3CBaggagePropagator();
        }]
      ]);
      BasicTracerProvider2._registeredExporters = /* @__PURE__ */ new Map();
      return BasicTracerProvider2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/StackContextManager.js
  var __read12 = function(o2, n2) {
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
  var __spreadArray8 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var StackContextManager = (
    /** @class */
    function() {
      function StackContextManager2() {
        this._enabled = false;
        this._currentContext = ROOT_CONTEXT;
      }
      StackContextManager2.prototype._bindFunction = function(context2, target) {
        if (context2 === void 0) {
          context2 = ROOT_CONTEXT;
        }
        var manager = this;
        var contextWrapper = function() {
          var _this = this;
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          return manager.with(context2, function() {
            return target.apply(_this, args);
          });
        };
        Object.defineProperty(contextWrapper, "length", {
          enumerable: false,
          configurable: true,
          writable: false,
          value: target.length
        });
        return contextWrapper;
      };
      StackContextManager2.prototype.active = function() {
        return this._currentContext;
      };
      StackContextManager2.prototype.bind = function(context2, target) {
        if (context2 === void 0) {
          context2 = this.active();
        }
        if (typeof target === "function") {
          return this._bindFunction(context2, target);
        }
        return target;
      };
      StackContextManager2.prototype.disable = function() {
        this._currentContext = ROOT_CONTEXT;
        this._enabled = false;
        return this;
      };
      StackContextManager2.prototype.enable = function() {
        if (this._enabled) {
          return this;
        }
        this._enabled = true;
        this._currentContext = ROOT_CONTEXT;
        return this;
      };
      StackContextManager2.prototype.with = function(context2, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        var previousContext = this._currentContext;
        this._currentContext = context2 || ROOT_CONTEXT;
        try {
          return fn.call.apply(fn, __spreadArray8([thisArg], __read12(args), false));
        } finally {
          this._currentContext = previousContext;
        }
      };
      return StackContextManager2;
    }()
  );

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/WebTracerProvider.js
  var __extends4 = /* @__PURE__ */ function() {
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
  var WebTracerProvider = (
    /** @class */
    function(_super) {
      __extends4(WebTracerProvider2, _super);
      function WebTracerProvider2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, config) || this;
        if (config.contextManager) {
          throw "contextManager should be defined in register method not in constructor";
        }
        if (config.propagator) {
          throw "propagator should be defined in register method not in constructor";
        }
        return _this;
      }
      WebTracerProvider2.prototype.register = function(config) {
        if (config === void 0) {
          config = {};
        }
        if (config.contextManager === void 0) {
          config.contextManager = new StackContextManager();
        }
        if (config.contextManager) {
          config.contextManager.enable();
        }
        _super.prototype.register.call(this, config);
      };
      return WebTracerProvider2;
    }(BasicTracerProvider)
  );

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
    PerformanceTimingNames2["UNLOAD_EVENT_END"] = "unloadEventEnd";
    PerformanceTimingNames2["UNLOAD_EVENT_START"] = "unloadEventStart";
  })(PerformanceTimingNames || (PerformanceTimingNames = {}));

  // node_modules/@opentelemetry/sdk-trace-web/node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_HTTP_RESPONSE_CONTENT_LENGTH = "http.response_content_length";
  var TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = "http.response_content_length_uncompressed";
  var SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH = TMP_HTTP_RESPONSE_CONTENT_LENGTH;
  var SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED;

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
  function addSpanNetworkEvent(span, performanceName, entries, refPerfName) {
    var perfTime = void 0;
    var refTime = void 0;
    if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number") {
      perfTime = entries[performanceName];
    }
    var refName = refPerfName || PerformanceTimingNames.FETCH_START;
    if (hasKey(entries, refName) && typeof entries[refName] === "number") {
      refTime = entries[refName];
    }
    if (perfTime !== void 0 && refTime !== void 0 && perfTime >= refTime) {
      span.addEvent(performanceName, perfTime);
      return span;
    }
    return void 0;
  }
  function addSpanNetworkEvents(span, resource, ignoreNetworkEvents) {
    if (ignoreNetworkEvents === void 0) {
      ignoreNetworkEvents = false;
    }
    if (!ignoreNetworkEvents) {
      addSpanNetworkEvent(span, PerformanceTimingNames.FETCH_START, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_START, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_END, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_START, resource);
      if (hasKey(resource, "name") && resource["name"].startsWith("https:")) {
        addSpanNetworkEvent(span, PerformanceTimingNames.SECURE_CONNECTION_START, resource);
      }
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_END, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.REQUEST_START, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_START, resource);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_END, resource);
    }
    var encodedLength = resource[PerformanceTimingNames.ENCODED_BODY_SIZE];
    if (encodedLength !== void 0) {
      span.setAttribute(SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH, encodedLength);
    }
    var decodedLength = resource[PerformanceTimingNames.DECODED_BODY_SIZE];
    if (decodedLength !== void 0 && encodedLength !== decodedLength) {
      span.setAttribute(SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, decodedLength);
    }
  }
  function sortResources(filteredResources) {
    return filteredResources.slice().sort(function(a2, b2) {
      var valueA = a2[PerformanceTimingNames.FETCH_START];
      var valueB = b2[PerformanceTimingNames.FETCH_START];
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
  function getResource(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType) {
    if (ignoredResources === void 0) {
      ignoredResources = /* @__PURE__ */ new WeakSet();
    }
    var parsedSpanUrl = parseUrl(spanUrl);
    spanUrl = parsedSpanUrl.toString();
    var filteredResources = filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType);
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
    var sorted = sortResources(filteredResources);
    if (parsedSpanUrl.origin !== getOrigin() && sorted.length > 1) {
      var corsPreFlightRequest = sorted[0];
      var mainRequest = findMainRequest(sorted, corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END], endTimeHR);
      var responseEnd = corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END];
      var fetchStart = mainRequest[PerformanceTimingNames.FETCH_START];
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
    var spanEndTime = hrTimeToNanoseconds(spanEndTimeHR);
    var minTime = hrTimeToNanoseconds(timeInputToHrTime(corsPreFlightRequestEndTime));
    var mainRequest = resources[1];
    var bestGap;
    var length = resources.length;
    for (var i2 = 1; i2 < length; i2++) {
      var resource = resources[i2];
      var resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      var resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      var currentGap = spanEndTime - resourceEndTime;
      if (resourceStartTime >= minTime && (!bestGap || currentGap < bestGap)) {
        bestGap = currentGap;
        mainRequest = resource;
      }
    }
    return mainRequest;
  }
  function filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType) {
    var startTime = hrTimeToNanoseconds(startTimeHR);
    var endTime = hrTimeToNanoseconds(endTimeHR);
    var filteredResources = resources.filter(function(resource) {
      var resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      var resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      return resource.initiatorType.toLowerCase() === (initiatorType || "xmlhttprequest") && resource.name === spanUrl && resourceStartTime >= startTime && resourceEndTime <= endTime;
    });
    if (filteredResources.length > 0) {
      filteredResources = filteredResources.filter(function(resource) {
        return !ignoredResources.has(resource);
      });
    }
    return filteredResources;
  }
  function parseUrl(url) {
    if (typeof URL === "function") {
      return new URL(url, typeof document !== "undefined" ? document.baseURI : typeof location !== "undefined" ? location.href : void 0);
    }
    var element = getUrlNormalizingAnchor();
    element.href = url;
    return element;
  }
  function getElementXPath(target, optimised) {
    if (target.nodeType === Node.DOCUMENT_NODE) {
      return "/";
    }
    var targetValue = getNodeValue(target, optimised);
    if (optimised && targetValue.indexOf("@id") > 0) {
      return targetValue;
    }
    var xpath = "";
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
    var allowedTypes = [target.nodeType];
    if (target.nodeType === Node.CDATA_SECTION_NODE) {
      allowedTypes.push(Node.TEXT_NODE);
    }
    var elements = Array.from(target.parentNode.childNodes);
    elements = elements.filter(function(element) {
      var localName = element.localName;
      return allowedTypes.indexOf(element.nodeType) >= 0 && localName === target.localName;
    });
    if (elements.length >= 1) {
      return elements.indexOf(target) + 1;
    }
    return 0;
  }
  function getNodeValue(target, optimised) {
    var nodeType = target.nodeType;
    var index = getNodeIndex(target);
    var nodeValue = "";
    if (nodeType === Node.ELEMENT_NODE) {
      var id = target.getAttribute("id");
      if (optimised && id) {
        return '//*[@id="' + id + '"]';
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
      return "/" + nodeValue + "[" + index + "]";
    }
    return "/" + nodeValue;
  }
  function shouldPropagateTraceHeaders(spanUrl, propagateTraceHeaderCorsUrls) {
    var propagateTraceHeaderUrls = propagateTraceHeaderCorsUrls || [];
    if (typeof propagateTraceHeaderUrls === "string" || propagateTraceHeaderUrls instanceof RegExp) {
      propagateTraceHeaderUrls = [propagateTraceHeaderUrls];
    }
    var parsedSpanUrl = parseUrl(spanUrl);
    if (parsedSpanUrl.origin === getOrigin()) {
      return true;
    } else {
      return propagateTraceHeaderUrls.some(function(propagateTraceHeaderUrl) {
        return urlMatches(spanUrl, propagateTraceHeaderUrl);
      });
    }
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
  var TMP_SERVICE_NAME2 = "service.name";
  var SEMRESATTRS_SERVICE_NAME2 = TMP_SERVICE_NAME2;

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
  var ATTR_EXCEPTION_MESSAGE = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE = "exception.type";

  // node_modules/@opentelemetry/opentelemetry-browser-detector/build/esm/types.js
  var BROWSER_ATTRIBUTES = {
    PLATFORM: "browser.platform",
    BRANDS: "browser.brands",
    MOBILE: "browser.mobile",
    LANGUAGE: "browser.language",
    USER_AGENT: "browser.user_agent"
  };

  // node_modules/@opentelemetry/opentelemetry-browser-detector/build/esm/BrowserDetector.js
  var __awaiter3 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator3 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var BrowserDetector = (
    /** @class */
    function() {
      function BrowserDetector2() {
      }
      BrowserDetector2.prototype.detect = function(config) {
        return __awaiter3(this, void 0, void 0, function() {
          var isBrowser, browserResource;
          return __generator3(this, function(_a3) {
            isBrowser = typeof navigator !== "undefined";
            if (!isBrowser) {
              return [2, Resource.empty()];
            }
            browserResource = getBrowserAttributes();
            return [2, this._getResourceAttributes(browserResource, config)];
          });
        });
      };
      BrowserDetector2.prototype._getResourceAttributes = function(browserResource, _config) {
        if (!browserResource[BROWSER_ATTRIBUTES.USER_AGENT] && !browserResource[BROWSER_ATTRIBUTES.PLATFORM]) {
          diag2.debug("BrowserDetector failed: Unable to find required browser resources. ");
          return Resource.empty();
        } else {
          return new Resource(browserResource);
        }
      };
      return BrowserDetector2;
    }()
  );
  function getBrowserAttributes() {
    var browserAttribs = {};
    var userAgentData = navigator.userAgentData;
    if (userAgentData) {
      browserAttribs[BROWSER_ATTRIBUTES.PLATFORM] = userAgentData.platform;
      browserAttribs[BROWSER_ATTRIBUTES.BRANDS] = userAgentData.brands.map(function(b2) {
        return b2.brand + " " + b2.version;
      });
      browserAttribs[BROWSER_ATTRIBUTES.MOBILE] = userAgentData.mobile;
    } else {
      browserAttribs[BROWSER_ATTRIBUTES.USER_AGENT] = navigator.userAgent;
    }
    browserAttribs[BROWSER_ATTRIBUTES.LANGUAGE] = navigator.language;
    return browserAttribs;
  }
  var browserDetector = new BrowserDetector();

  // node_modules/@honeycombio/opentelemetry-web/dist/esm/user-interaction-instrumentation-C_cw3q1v.js
  var VERSION4 = "0.13.0";
  var INSTRUMENTATION_NAME = "@honeycombio/user-instrumentation";
  var DEFAULT_EVENT_NAMES = ["click"];
  var UserInteractionInstrumentation = class _UserInteractionInstrumentation extends InstrumentationBase {
    constructor(config = {}) {
      var _a3, _b;
      super(INSTRUMENTATION_NAME, VERSION4, config);
      this._config = config;
      this._isEnabled = (_a3 = this._config.enabled) !== null && _a3 !== void 0 ? _a3 : false;
      this._listeners = (_b = this._listeners) !== null && _b !== void 0 ? _b : [];
    }
    init() {
    }
    static handleEndSpan(ev) {
      var _a3;
      (_a3 = _UserInteractionInstrumentation._eventMap.get(ev)) === null || _a3 === void 0 ? void 0 : _a3.end();
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
      var _a3;
      if (this._isEnabled) {
        return;
      }
      const rootNode = this.getRootNode();
      this._listeners = [];
      const eventNames = (_a3 = this._config.eventNames) !== null && _a3 !== void 0 ? _a3 : DEFAULT_EVENT_NAMES;
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
  var import_ua_parser_js = __toESM(require_ua_parser());

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/OTLPExporterBase.js
  var OTLPExporterBase = (
    /** @class */
    function() {
      function OTLPExporterBase2(_delegate) {
        this._delegate = _delegate;
      }
      OTLPExporterBase2.prototype.export = function(items, resultCallback) {
        this._delegate.export(items, resultCallback);
      };
      OTLPExporterBase2.prototype.forceFlush = function() {
        return this._delegate.forceFlush();
      };
      OTLPExporterBase2.prototype.shutdown = function() {
        return this._delegate.shutdown();
      };
      return OTLPExporterBase2;
    }()
  );

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/types.js
  var __extends5 = /* @__PURE__ */ function() {
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
  var OTLPExporterError = (
    /** @class */
    function(_super) {
      __extends5(OTLPExporterError2, _super);
      function OTLPExporterError2(message, code, data) {
        var _this = _super.call(this, message) || this;
        _this.name = "OTLPExporterError";
        _this.data = data;
        _this.code = code;
        return _this;
      }
      return OTLPExporterError2;
    }(Error)
  );

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/shared-configuration.js
  function validateTimeoutMillis(timeoutMillis) {
    if (!Number.isNaN(timeoutMillis) && Number.isFinite(timeoutMillis) && timeoutMillis > 0) {
      return timeoutMillis;
    }
    throw new Error("Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '" + timeoutMillis + "')");
  }
  function wrapStaticHeadersInFunction(headers) {
    if (headers == null) {
      return void 0;
    }
    return function() {
      return headers;
    };
  }
  function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    var _a3, _b, _c, _d, _e, _f;
    return {
      timeoutMillis: validateTimeoutMillis((_b = (_a3 = userProvidedConfiguration.timeoutMillis) !== null && _a3 !== void 0 ? _a3 : fallbackConfiguration.timeoutMillis) !== null && _b !== void 0 ? _b : defaultConfiguration.timeoutMillis),
      concurrencyLimit: (_d = (_c = userProvidedConfiguration.concurrencyLimit) !== null && _c !== void 0 ? _c : fallbackConfiguration.concurrencyLimit) !== null && _d !== void 0 ? _d : defaultConfiguration.concurrencyLimit,
      compression: (_f = (_e = userProvidedConfiguration.compression) !== null && _e !== void 0 ? _e : fallbackConfiguration.compression) !== null && _f !== void 0 ? _f : defaultConfiguration.compression
    };
  }
  function getSharedConfigurationDefaults() {
    return {
      timeoutMillis: 1e4,
      concurrencyLimit: 30,
      compression: "none"
    };
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/bounded-queue-export-promise-handler.js
  var __awaiter4 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator4 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var BoundedQueueExportPromiseHandler = (
    /** @class */
    function() {
      function BoundedQueueExportPromiseHandler2(concurrencyLimit) {
        this._sendingPromises = [];
        this._concurrencyLimit = concurrencyLimit;
      }
      BoundedQueueExportPromiseHandler2.prototype.pushPromise = function(promise) {
        var _this = this;
        if (this.hasReachedLimit()) {
          throw new Error("Concurrency Limit reached");
        }
        this._sendingPromises.push(promise);
        var popPromise = function() {
          var index = _this._sendingPromises.indexOf(promise);
          _this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
      };
      BoundedQueueExportPromiseHandler2.prototype.hasReachedLimit = function() {
        return this._sendingPromises.length >= this._concurrencyLimit;
      };
      BoundedQueueExportPromiseHandler2.prototype.awaitAll = function() {
        return __awaiter4(this, void 0, void 0, function() {
          return __generator4(this, function(_a3) {
            switch (_a3.label) {
              case 0:
                return [4, Promise.all(this._sendingPromises)];
              case 1:
                _a3.sent();
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      return BoundedQueueExportPromiseHandler2;
    }()
  );
  function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/logging-response-handler.js
  function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, "partialSuccess");
  }
  function createLoggingPartialSuccessResponseHandler() {
    return {
      handleResponse: function(response) {
        if (response == null || !isPartialSuccessResponse(response) || response.partialSuccess == null || Object.keys(response.partialSuccess).length === 0) {
          return;
        }
        diag2.warn("Received Partial Success response:", JSON.stringify(response.partialSuccess));
      }
    };
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-export-delegate.js
  var __awaiter5 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator5 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var OTLPExportDelegate = (
    /** @class */
    function() {
      function OTLPExportDelegate2(_transport, _serializer, _responseHandler, _promiseQueue, _timeout) {
        this._transport = _transport;
        this._serializer = _serializer;
        this._responseHandler = _responseHandler;
        this._promiseQueue = _promiseQueue;
        this._timeout = _timeout;
        this._diagLogger = diag2.createComponentLogger({
          namespace: "OTLPExportDelegate"
        });
      }
      OTLPExportDelegate2.prototype.export = function(internalRepresentation, resultCallback) {
        var _this = this;
        this._diagLogger.debug("items to be sent", internalRepresentation);
        if (this._promiseQueue.hasReachedLimit()) {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: new Error("Concurrent export limit reached")
          });
          return;
        }
        var serializedRequest = this._serializer.serializeRequest(internalRepresentation);
        if (serializedRequest == null) {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: new Error("Nothing to send")
          });
          return;
        }
        this._promiseQueue.pushPromise(this._transport.send(serializedRequest, this._timeout).then(function(response) {
          if (response.status === "success") {
            if (response.data != null) {
              try {
                _this._responseHandler.handleResponse(_this._serializer.deserializeResponse(response.data));
              } catch (e2) {
                _this._diagLogger.warn("Export succeeded but could not deserialize response - is the response specification compliant?", e2, response.data);
              }
            }
            resultCallback({
              code: ExportResultCode.SUCCESS
            });
            return;
          } else if (response.status === "failure" && response.error) {
            resultCallback({
              code: ExportResultCode.FAILED,
              error: response.error
            });
            return;
          } else if (response.status === "retryable") {
            resultCallback({
              code: ExportResultCode.FAILED,
              error: new OTLPExporterError("Export failed with retryable status")
            });
          } else {
            resultCallback({
              code: ExportResultCode.FAILED,
              error: new OTLPExporterError("Export failed with unknown error")
            });
          }
        }, function(reason) {
          return resultCallback({
            code: ExportResultCode.FAILED,
            error: reason
          });
        }));
      };
      OTLPExportDelegate2.prototype.forceFlush = function() {
        return this._promiseQueue.awaitAll();
      };
      OTLPExportDelegate2.prototype.shutdown = function() {
        return __awaiter5(this, void 0, void 0, function() {
          return __generator5(this, function(_a3) {
            switch (_a3.label) {
              case 0:
                this._diagLogger.debug("shutdown started");
                return [4, this.forceFlush()];
              case 1:
                _a3.sent();
                this._transport.shutdown();
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      return OTLPExportDelegate2;
    }()
  );
  function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(components.transport, components.serializer, createLoggingPartialSuccessResponseHandler(), components.promiseHandler, settings.timeout);
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-network-export-delegate.js
  function createOtlpNetworkExportDelegate(options, serializer, transport) {
    return createOtlpExportDelegate({
      transport,
      serializer,
      promiseHandler: createBoundedQueueExportPromiseHandler(options)
    }, { timeout: options.timeoutMillis });
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-transformer/build/esm/common/utils.js
  function hrTimeToNanos(hrTime2) {
    var NANOSECONDS = BigInt(1e9);
    return BigInt(hrTime2[0]) * NANOSECONDS + BigInt(hrTime2[1]);
  }
  function toLongBits(value) {
    var low = Number(BigInt.asUintN(32, value));
    var high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
  }
  function encodeAsLongBits(hrTime2) {
    var nanos = hrTimeToNanos(hrTime2);
    return toLongBits(nanos);
  }
  function encodeAsString(hrTime2) {
    var nanos = hrTimeToNanos(hrTime2);
    return nanos.toString();
  }
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : hrTimeToNanoseconds;
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
    var _a3, _b;
    if (options === void 0) {
      return DEFAULT_ENCODER;
    }
    var useLongBits = (_a3 = options.useLongBits) !== null && _a3 !== void 0 ? _a3 : true;
    var useHex = (_b = options.useHex) !== null && _b !== void 0 ? _b : false;
    return {
      encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
      encodeSpanContext: useHex ? identity : hexToBinary,
      encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary
    };
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-transformer/build/esm/common/internal.js
  var __read13 = function(o2, n2) {
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
    return Object.keys(attributes).map(function(key) {
      return toKeyValue(key, attributes[key]);
    });
  }
  function toKeyValue(key, value) {
    return {
      key,
      value: toAnyValue(value)
    };
  }
  function toAnyValue(value) {
    var t3 = typeof value;
    if (t3 === "string")
      return { stringValue: value };
    if (t3 === "number") {
      if (!Number.isInteger(value))
        return { doubleValue: value };
      return { intValue: value };
    }
    if (t3 === "boolean")
      return { boolValue: value };
    if (value instanceof Uint8Array)
      return { bytesValue: value };
    if (Array.isArray(value))
      return { arrayValue: { values: value.map(toAnyValue) } };
    if (t3 === "object" && value != null)
      return {
        kvlistValue: {
          values: Object.entries(value).map(function(_a3) {
            var _b = __read13(_a3, 2), k2 = _b[0], v2 = _b[1];
            return toKeyValue(k2, v2);
          })
        }
      };
    return {};
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-transformer/build/esm/trace/internal.js
  var __values7 = function(o2) {
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
  var __read14 = function(o2, n2) {
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
  function sdkSpanToOtlpSpan(span, encoder) {
    var _a3;
    var ctx = span.spanContext();
    var status = span.status;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId: encoder.encodeOptionalSpanContext(span.parentSpanId),
      traceState: (_a3 = ctx.traceState) === null || _a3 === void 0 ? void 0 : _a3.serialize(),
      name: span.name,
      // Span kind is offset by 1 because the API does not define a value for unset
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: toAttributes(span.attributes),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map(function(event) {
        return toOtlpSpanEvent(event, encoder);
      }),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        // API and proto enums share the same values
        code: status.code,
        message: status.message
      },
      links: span.links.map(function(link) {
        return toOtlpLink(link, encoder);
      }),
      droppedLinksCount: span.droppedLinksCount
    };
  }
  function toOtlpLink(link, encoder) {
    var _a3;
    return {
      attributes: link.attributes ? toAttributes(link.attributes) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: (_a3 = link.context.traceState) === null || _a3 === void 0 ? void 0 : _a3.serialize(),
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
    var encoder = getOtlpEncoder(options);
    return {
      resourceSpans: spanRecordsToResourceSpans(spans, encoder)
    };
  }
  function createResourceMap(readableSpans) {
    var e_1, _a3;
    var resourceMap = /* @__PURE__ */ new Map();
    try {
      for (var readableSpans_1 = __values7(readableSpans), readableSpans_1_1 = readableSpans_1.next(); !readableSpans_1_1.done; readableSpans_1_1 = readableSpans_1.next()) {
        var record = readableSpans_1_1.value;
        var ilmMap = resourceMap.get(record.resource);
        if (!ilmMap) {
          ilmMap = /* @__PURE__ */ new Map();
          resourceMap.set(record.resource, ilmMap);
        }
        var instrumentationLibraryKey = record.instrumentationLibrary.name + "@" + (record.instrumentationLibrary.version || "") + ":" + (record.instrumentationLibrary.schemaUrl || "");
        var records = ilmMap.get(instrumentationLibraryKey);
        if (!records) {
          records = [];
          ilmMap.set(instrumentationLibraryKey, records);
        }
        records.push(record);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (readableSpans_1_1 && !readableSpans_1_1.done && (_a3 = readableSpans_1.return)) _a3.call(readableSpans_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    var resourceMap = createResourceMap(readableSpans);
    var out = [];
    var entryIterator = resourceMap.entries();
    var entry = entryIterator.next();
    while (!entry.done) {
      var _a3 = __read14(entry.value, 2), resource = _a3[0], ilmMap = _a3[1];
      var scopeResourceSpans = [];
      var ilmIterator = ilmMap.values();
      var ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        var scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          var spans = scopeSpans.map(function(readableSpan) {
            return sdkSpanToOtlpSpan(readableSpan, encoder);
          });
          scopeResourceSpans.push({
            scope: createInstrumentationScope(scopeSpans[0].instrumentationLibrary),
            spans,
            schemaUrl: scopeSpans[0].instrumentationLibrary.schemaUrl
          });
        }
        ilmEntry = ilmIterator.next();
      }
      var transformedSpans = {
        resource: createResource(resource),
        scopeSpans: scopeResourceSpans,
        schemaUrl: void 0
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-transformer/build/esm/trace/json/trace.js
  var JsonTraceSerializer = {
    serializeRequest: function(arg) {
      var request = createExportTraceServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      var encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: function(arg) {
      var decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/retrying-transport.js
  var __awaiter6 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator6 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var MAX_ATTEMPTS = 5;
  var INITIAL_BACKOFF = 1e3;
  var MAX_BACKOFF = 5e3;
  var BACKOFF_MULTIPLIER = 1.5;
  var JITTER = 0.2;
  function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
  }
  var RetryingTransport = (
    /** @class */
    function() {
      function RetryingTransport2(_transport) {
        this._transport = _transport;
      }
      RetryingTransport2.prototype.retry = function(data, timeoutMillis, inMillis) {
        var _this = this;
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            _this._transport.send(data, timeoutMillis).then(resolve, reject);
          }, inMillis);
        });
      };
      RetryingTransport2.prototype.send = function(data, timeoutMillis) {
        var _a3;
        return __awaiter6(this, void 0, void 0, function() {
          var deadline, result, attempts, nextBackoff, backoff, retryInMillis, remainingTimeoutMillis;
          return __generator6(this, function(_b) {
            switch (_b.label) {
              case 0:
                deadline = Date.now() + timeoutMillis;
                return [4, this._transport.send(data, timeoutMillis)];
              case 1:
                result = _b.sent();
                attempts = MAX_ATTEMPTS;
                nextBackoff = INITIAL_BACKOFF;
                _b.label = 2;
              case 2:
                if (!(result.status === "retryable" && attempts > 0)) return [3, 4];
                attempts--;
                backoff = Math.max(Math.min(nextBackoff, MAX_BACKOFF) + getJitter(), 0);
                nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
                retryInMillis = (_a3 = result.retryInMillis) !== null && _a3 !== void 0 ? _a3 : backoff;
                remainingTimeoutMillis = deadline - Date.now();
                if (retryInMillis > remainingTimeoutMillis) {
                  return [2, result];
                }
                return [4, this.retry(data, remainingTimeoutMillis, retryInMillis)];
              case 3:
                result = _b.sent();
                return [3, 2];
              case 4:
                return [2, result];
            }
          });
        });
      };
      RetryingTransport2.prototype.shutdown = function() {
        return this._transport.shutdown();
      };
      return RetryingTransport2;
    }()
  );
  function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/is-export-retryable.js
  function isExportRetryable(statusCode) {
    var retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
  }
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
      return void 0;
    }
    var seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
      return seconds > 0 ? seconds * 1e3 : -1;
    }
    var delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
      return delay;
    }
    return 0;
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/xhr-transport.js
  var __read15 = function(o2, n2) {
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
  var XhrTransport = (
    /** @class */
    function() {
      function XhrTransport2(_parameters) {
        this._parameters = _parameters;
      }
      XhrTransport2.prototype.send = function(data, timeoutMillis) {
        var _this = this;
        return new Promise(function(resolve) {
          var xhr = new XMLHttpRequest();
          xhr.timeout = timeoutMillis;
          xhr.open("POST", _this._parameters.url);
          var headers = _this._parameters.headers();
          Object.entries(headers).forEach(function(_a3) {
            var _b = __read15(_a3, 2), k2 = _b[0], v2 = _b[1];
            xhr.setRequestHeader(k2, v2);
          });
          xhr.ontimeout = function(_2) {
            resolve({
              status: "failure",
              error: new Error("XHR request timed out")
            });
          };
          xhr.onreadystatechange = function() {
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
          xhr.onabort = function() {
            resolve({
              status: "failure",
              error: new Error("XHR request aborted")
            });
          };
          xhr.onerror = function() {
            resolve({
              status: "failure",
              error: new Error("XHR request errored")
            });
          };
          xhr.send(data);
        });
      };
      XhrTransport2.prototype.shutdown = function() {
      };
      return XhrTransport2;
    }()
  );
  function createXhrTransport(parameters) {
    return new XhrTransport(parameters);
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/send-beacon-transport.js
  var SendBeaconTransport = (
    /** @class */
    function() {
      function SendBeaconTransport2(_params) {
        this._params = _params;
      }
      SendBeaconTransport2.prototype.send = function(data) {
        var _this = this;
        return new Promise(function(resolve) {
          if (navigator.sendBeacon(_this._params.url, new Blob([data], { type: _this._params.blobType }))) {
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
      };
      SendBeaconTransport2.prototype.shutdown = function() {
      };
      return SendBeaconTransport2;
    }()
  );
  function createSendBeaconTransport(parameters) {
    return new SendBeaconTransport(parameters);
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-browser-http-export-delegate.js
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

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/util.js
  var __read16 = function(o2, n2) {
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
  function validateAndNormalizeHeaders(partialHeaders) {
    return function() {
      var _a3;
      var headers = {};
      Object.entries((_a3 = partialHeaders === null || partialHeaders === void 0 ? void 0 : partialHeaders()) !== null && _a3 !== void 0 ? _a3 : {}).forEach(function(_a4) {
        var _b = __read16(_a4, 2), key = _b[0], value = _b[1];
        if (typeof value !== "undefined") {
          headers[key] = String(value);
        } else {
          diag2.warn('Header "' + key + '" has invalid value (' + value + ") and will be ignored");
        }
      });
      return headers;
    };
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/otlp-http-configuration.js
  var __assign4 = function() {
    __assign4 = Object.assign || function(t3) {
      for (var s2, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
        s2 = arguments[i2];
        for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2))
          t3[p2] = s2[p2];
      }
      return t3;
    };
    return __assign4.apply(this, arguments);
  };
  function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    var requiredHeaders = __assign4({}, defaultHeaders());
    var headers = {};
    return function() {
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
    } catch (e2) {
      throw new Error("Configuration: Could not parse user-provided export URL: '" + url + "'");
    }
  }
  function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    var _a3, _b, _c, _d;
    return __assign4(__assign4({}, mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration)), { headers: mergeHeaders(validateAndNormalizeHeaders(userProvidedConfiguration.headers), fallbackConfiguration.headers, defaultConfiguration.headers), url: (_b = (_a3 = validateUserProvidedUrl(userProvidedConfiguration.url)) !== null && _a3 !== void 0 ? _a3 : fallbackConfiguration.url) !== null && _b !== void 0 ? _b : defaultConfiguration.url, agentOptions: (_d = (_c = userProvidedConfiguration.agentOptions) !== null && _c !== void 0 ? _c : fallbackConfiguration.agentOptions) !== null && _d !== void 0 ? _d : defaultConfiguration.agentOptions });
  }
  function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return __assign4(__assign4({}, getSharedConfigurationDefaults()), { headers: function() {
      return requiredHeaders;
    }, url: "http://localhost:4318/" + signalResourcePath, agentOptions: { keepAlive: true } });
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/convert-legacy-browser-http-options.js
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

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/create-legacy-browser-delegate.js
  function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    var useXhr = !!config.headers || typeof navigator.sendBeacon !== "function";
    var options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    if (useXhr) {
      return createOtlpXhrExportDelegate(options, serializer);
    } else {
      return createOtlpSendBeaconExportDelegate(options, serializer);
    }
  }

  // node_modules/@honeycombio/opentelemetry-web/node_modules/@opentelemetry/exporter-trace-otlp-http/build/esm/platform/browser/OTLPTraceExporter.js
  var __extends6 = /* @__PURE__ */ function() {
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
  var OTLPTraceExporter = (
    /** @class */
    function(_super) {
      __extends6(OTLPTraceExporter2, _super);
      function OTLPTraceExporter2(config) {
        if (config === void 0) {
          config = {};
        }
        return _super.call(this, createLegacyOtlpBrowserExportDelegate(config, JsonTraceSerializer, "v1/traces", { "Content-Type": "application/json" })) || this;
      }
      return OTLPTraceExporter2;
    }(OTLPExporterBase)
  );

  // node_modules/@honeycombio/opentelemetry-web/dist/esm/index.js
  var shimmer2 = __toESM(require_shimmer());
  var import_tracekit = __toESM(require_tracekit());
  var SESSION_ID_BYTES = 16;
  var SHARED_CHAR_CODES_ARRAY2 = Array(32);
  var SessionIdSpanProcessor = class {
    constructor() {
      this._idGenerator = getIdGenerator2(SESSION_ID_BYTES);
      this._sessionId = this._idGenerator();
    }
    onStart(span) {
      span.setAttribute("session.id", this._sessionId);
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
  function getIdGenerator2(bytes) {
    return function generateId() {
      for (let i2 = 0; i2 < bytes * 2; i2++) {
        SHARED_CHAR_CODES_ARRAY2[i2] = Math.floor(Math.random() * 16) + 48;
        if (SHARED_CHAR_CODES_ARRAY2[i2] >= 58) {
          SHARED_CHAR_CODES_ARRAY2[i2] += 39;
        }
      }
      return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY2.slice(0, bytes * 2));
    };
  }
  var WebSDK = class {
    /**
     * Create a new Web SDK instance
     */
    constructor(configuration = {}) {
      var _a3, _b, _c, _d;
      this._resource = (_a3 = configuration.resource) !== null && _a3 !== void 0 ? _a3 : new Resource({});
      this._resourceDetectors = (_b = configuration.resourceDetectors) !== null && _b !== void 0 ? _b : [browserDetector];
      this._serviceName = configuration.serviceName;
      this._autoDetectResources = (_c = configuration.autoDetectResources) !== null && _c !== void 0 ? _c : true;
      if (configuration.spanProcessor || configuration.traceExporter) {
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
        const spanProcessor = (_d = configuration.spanProcessor) !== null && _d !== void 0 ? _d : new BatchSpanProcessor(configuration.traceExporter);
        this._tracerProviderConfig = {
          tracerConfig: tracerProviderConfig,
          spanProcessor,
          contextManager: configuration.contextManager,
          textMapPropagator: configuration.textMapPropagator
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
      var _a3, _b, _c;
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
        this._resource = this._resource.merge(detectResourcesSync(internalConfig));
      }
      this._resource = this._serviceName === void 0 ? this._resource : this._resource.merge(new Resource({
        [SEMRESATTRS_SERVICE_NAME2]: this._serviceName
      }));
      const tracerProvider = new WebTracerProvider(Object.assign(Object.assign({}, (_a3 = this._tracerProviderConfig) === null || _a3 === void 0 ? void 0 : _a3.tracerConfig), {
        resource: this._resource
      }));
      this._tracerProvider = tracerProvider;
      if (this._tracerProviderConfig) {
        tracerProvider.addSpanProcessor(this._tracerProviderConfig.spanProcessor);
      }
      tracerProvider.register({
        contextManager: (_b = this._tracerProviderConfig) === null || _b === void 0 ? void 0 : _b.contextManager,
        propagator: (_c = this._tracerProviderConfig) === null || _c === void 0 ? void 0 : _c.textMapPropagator
      });
      tracerProvider.addSpanProcessor(new SessionIdSpanProcessor());
    }
    /* Experimental getter method: not currently part of the upstream
     * sdk's API */
    getResourceAttributes() {
      return this._resource.attributes;
    }
    shutdown() {
      const promises = [];
      if (this._tracerProvider) {
        promises.push(this._tracerProvider.shutdown());
      }
      return Promise.all(promises).then(() => {
      });
    }
  };
  function configureHoneycombResource() {
    return new Resource({
      "honeycomb.distro.version": VERSION4,
      "honeycomb.distro.runtime_version": "browser"
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
      return new Resource({});
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
      "entry_page.url": optionalAttribute(options.url, href),
      "entry_page.path": optionalAttribute(options.path, pathname),
      "entry_page.search": optionalAttribute(options.search, search),
      "entry_page.hash": optionalAttribute(options.hash, hash),
      "entry_page.hostname": optionalAttribute(options.hostname, hostname),
      "entry_page.referrer": optionalAttribute(options.referrer, document.referrer)
    };
    return new Resource(attributes);
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
    var _a3;
    return (_a3 = networkInformation === null || networkInformation === void 0 ? void 0 : networkInformation.effectiveType) !== null && _a3 !== void 0 ? _a3 : "unknown";
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
    return new Resource({
      "user_agent.original": navigator.userAgent,
      //https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_tablet_or_desktop
      "browser.mobile": navigator.userAgent.includes("Mobi"),
      "browser.touch_screen_enabled": navigator.maxTouchPoints > 0,
      "browser.language": navigator.language,
      "browser.name": browserName,
      "browser.version": browserVersion,
      "device.type": deviceType,
      "network.effectiveType": computeNetworkType(navigator.connection),
      "screen.width": window.screen.width,
      "screen.height": window.screen.height,
      "screen.size": computeScreenSize(window.screen.width)
    });
  }
  function mergeResources(resources) {
    let mergedResources = validateResource(resources[0]);
    for (let i2 = 1; i2 < resources.length; i2++) {
      if (!resources[i2]) {
        continue;
      }
      const resource = validateResource(resources[i2]);
      mergedResources = mergedResources.merge(resource);
    }
    return mergedResources;
  }
  function validateResource(resource) {
    if (resource instanceof Resource) {
      return resource;
    }
    if (resource) {
      return new Resource(resource);
    }
    return new Resource({});
  }
  var DEFAULT_API_ENDPOINT = "https://api.honeycomb.io";
  var TRACES_PATH = "v1/traces";
  var DEFAULT_TRACES_ENDPOINT = `${DEFAULT_API_ENDPOINT}/${TRACES_PATH}`;
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
  function maybeAppendTracesPath(url) {
    if (url.endsWith(TRACES_PATH) || url.endsWith(`${TRACES_PATH}/`)) {
      return url;
    }
    return url.endsWith("/") ? url + TRACES_PATH : url + "/" + TRACES_PATH;
  }
  var getTracesEndpoint = (options) => {
    if (options === null || options === void 0 ? void 0 : options.tracesEndpoint) {
      return options.tracesEndpoint;
    }
    if (options === null || options === void 0 ? void 0 : options.endpoint) {
      return maybeAppendTracesPath(options.endpoint);
    }
    return DEFAULT_TRACES_ENDPOINT;
  };
  var getTracesApiKey = (options) => {
    return (options === null || options === void 0 ? void 0 : options.tracesApiKey) || (options === null || options === void 0 ? void 0 : options.apiKey);
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
  var SAMPLER_OVERRIDE_WARNING = createHoneycombSDKLogMessage("\u{1F528} Default deterministic sampler has been overridden. Honeycomb requires a resource attribute called SampleRate to properly show weighted values. Non-deterministic sampleRate could lead to missing spans in Honeycomb. See our docs for more details. https://docs.honeycomb.io/getting-data-in/opentelemetry/node-distro/#sampling-without-the-honeycomb-sdk");
  var MISSING_FIELDS_FOR_LOCAL_VISUALIZATIONS = createHoneycombSDKLogMessage("\u{1F515} Disabling local visualizations - must have both service name and API key configured.");
  var MISSING_FIELDS_FOR_GENERATING_LINKS = createHoneycombSDKLogMessage("\u{1F515} Disabling local visualizations - cannot infer auth and ui url roots from endpoint url.");
  var FAILED_AUTH_FOR_LOCAL_VISUALIZATIONS = createHoneycombSDKLogMessage("\u{1F515} Failed to get proper auth response from Honeycomb. No local visualization available.");
  var NO_EXPORTERS_DISABLED_DEFAULT = createHoneycombSDKLogMessage("\u{1F515} Default honeycomb exporter disabled but no exporters provided");
  var validateOptionsWarnings = (options) => {
    var _a3;
    const logLevel = (options === null || options === void 0 ? void 0 : options.logLevel) ? options.logLevel : DiagLogLevel.DEBUG;
    if (options === null || options === void 0 ? void 0 : options.skipOptionsValidation) {
      if (logLevel >= DiagLogLevel.DEBUG) {
        console.debug(SKIPPING_OPTIONS_VALIDATION_MSG);
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
    if ((options === null || options === void 0 ? void 0 : options.disableDefaultTraceExporter) === true && !(options === null || options === void 0 ? void 0 : options.traceExporter) && !((_a3 = options === null || options === void 0 ? void 0 : options.traceExporters) === null || _a3 === void 0 ? void 0 : _a3.length)) {
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
  var BaggageSpanProcessor = class {
    constructor() {
    }
    onStart(span, parentContext) {
      var _a3, _b;
      ((_b = (_a3 = propagation.getBaggage(parentContext)) === null || _a3 === void 0 ? void 0 : _a3.getAllEntries()) !== null && _b !== void 0 ? _b : []).forEach((entry) => {
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
        "browser.width": window.innerWidth,
        "browser.height": window.innerHeight,
        "page.hash": hash,
        "page.url": href,
        "page.route": pathname,
        "page.hostname": hostname,
        "page.search": search,
        "url.path": pathname
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
  var TEAM_HEADER_KEY = "x-honeycomb-team";
  var DATASET_HEADER_KEY = "x-honeycomb-dataset";
  function configureHoneycombHttpJsonTraceExporter(options) {
    const apiKey = getTracesApiKey(options);
    return new OTLPTraceExporter({
      url: getTracesEndpoint(options),
      headers: configureHeaders(options, apiKey)
    });
  }
  function configureHeaders(options, apiKey) {
    const headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers);
    if (apiKey && !headers[TEAM_HEADER_KEY]) {
      headers[TEAM_HEADER_KEY] = apiKey;
    }
    if (isClassic(apiKey) && (options === null || options === void 0 ? void 0 : options.dataset)) {
      headers[DATASET_HEADER_KEY] = options === null || options === void 0 ? void 0 : options.dataset;
    }
    return headers;
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
        var _a3, _b, _c;
        const respData = data;
        if ((_a3 = respData.team) === null || _a3 === void 0 ? void 0 : _a3.slug) {
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
          if (!span.parentSpanId && this._logLevel >= DiagLogLevel.INFO) {
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
  var configureSpanProcessors = (options) => {
    const honeycombSpanProcessor = new CompositeSpanProcessor();
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
    honeycombSpanProcessor.addProcessor(new BatchSpanProcessor(configureCompositeExporter([...honeycombTraceExporters])));
    honeycombSpanProcessor.addProcessor(new BaggageSpanProcessor());
    honeycombSpanProcessor.addProcessor(new BrowserAttributesSpanProcessor());
    if (options === null || options === void 0 ? void 0 : options.spanProcessor) {
      honeycombSpanProcessor.addProcessor(options === null || options === void 0 ? void 0 : options.spanProcessor);
    }
    if (options === null || options === void 0 ? void 0 : options.spanProcessors) {
      options.spanProcessors.forEach((processor) => {
        honeycombSpanProcessor.addProcessor(processor);
      });
    }
    return honeycombSpanProcessor;
  };
  var CompositeSpanProcessor = class {
    constructor() {
      this.spanProcessors = [];
    }
    addProcessor(processor) {
      this.spanProcessors.push(processor);
    }
    getSpanProcessors() {
      return this.spanProcessors;
    }
    onStart(span, parentContext) {
      this.spanProcessors.forEach((processor) => {
        processor.onStart(span, parentContext);
      });
    }
    onEnd(span) {
      this.spanProcessors.forEach((processor) => {
        processor.onEnd(span);
      });
    }
    forceFlush() {
      return Promise.all(this.spanProcessors.map((processor) => processor.forceFlush())).then(() => {
      });
    }
    shutdown() {
      return Promise.all(this.spanProcessors.map((processor) => processor.forceFlush())).then(() => {
      });
    }
  };
  var configureDeterministicSampler = (options) => {
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
  var t;
  var e;
  var n = function() {
    var t3 = self.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (t3 && t3.responseStart > 0 && t3.responseStart < performance.now()) return t3;
  };
  var r = function(t3) {
    if ("loading" === document.readyState) return "loading";
    var e2 = n();
    if (e2) {
      if (t3 < e2.domInteractive) return "loading";
      if (0 === e2.domContentLoadedEventStart || t3 < e2.domContentLoadedEventStart) return "dom-interactive";
      if (0 === e2.domComplete || t3 < e2.domComplete) return "dom-content-loaded";
    }
    return "complete";
  };
  var i = function(t3) {
    var e2 = t3.nodeName;
    return 1 === t3.nodeType ? e2.toLowerCase() : e2.toUpperCase().replace(/^#/, "");
  };
  var a = function(t3, e2) {
    var n2 = "";
    try {
      for (; t3 && 9 !== t3.nodeType; ) {
        var r2 = t3, a2 = r2.id ? "#" + r2.id : i(r2) + (r2.classList && r2.classList.value && r2.classList.value.trim() && r2.classList.value.trim().length ? "." + r2.classList.value.trim().replace(/\s+/g, ".") : "");
        if (n2.length + a2.length > (e2 || 100) - 1) return n2 || a2;
        if (n2 = n2 ? a2 + ">" + n2 : a2, r2.id) break;
        t3 = r2.parentNode;
      }
    } catch (t4) {
    }
    return n2;
  };
  var o = -1;
  var c = function() {
    return o;
  };
  var u = function(t3) {
    addEventListener("pageshow", function(e2) {
      e2.persisted && (o = e2.timeStamp, t3(e2));
    }, true);
  };
  var s = function() {
    var t3 = n();
    return t3 && t3.activationStart || 0;
  };
  var f = function(t3, e2) {
    var r2 = n(), i2 = "navigate";
    c() >= 0 ? i2 = "back-forward-cache" : r2 && (document.prerendering || s() > 0 ? i2 = "prerender" : document.wasDiscarded ? i2 = "restore" : r2.type && (i2 = r2.type.replace(/_/g, "-")));
    return {
      name: t3,
      value: void 0 === e2 ? -1 : e2,
      rating: "good",
      delta: 0,
      entries: [],
      id: "v4-".concat(Date.now(), "-").concat(Math.floor(8999999999999 * Math.random()) + 1e12),
      navigationType: i2
    };
  };
  var d = function(t3, e2, n2) {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(t3)) {
        var r2 = new PerformanceObserver(function(t4) {
          Promise.resolve().then(function() {
            e2(t4.getEntries());
          });
        });
        return r2.observe(Object.assign({
          type: t3,
          buffered: true
        }, n2 || {})), r2;
      }
    } catch (t4) {
    }
  };
  var l = function(t3, e2, n2, r2) {
    var i2, a2;
    return function(o2) {
      e2.value >= 0 && (o2 || r2) && ((a2 = e2.value - (i2 || 0)) || void 0 === i2) && (i2 = e2.value, e2.delta = a2, e2.rating = function(t4, e3) {
        return t4 > e3[1] ? "poor" : t4 > e3[0] ? "needs-improvement" : "good";
      }(e2.value, n2), t3(e2));
    };
  };
  var m = function(t3) {
    requestAnimationFrame(function() {
      return requestAnimationFrame(function() {
        return t3();
      });
    });
  };
  var p = function(t3) {
    document.addEventListener("visibilitychange", function() {
      "hidden" === document.visibilityState && t3();
    });
  };
  var v = function(t3) {
    var e2 = false;
    return function() {
      e2 || (t3(), e2 = true);
    };
  };
  var g = -1;
  var h = function() {
    return "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0;
  };
  var T = function(t3) {
    "hidden" === document.visibilityState && g > -1 && (g = "visibilitychange" === t3.type ? t3.timeStamp : 0, E());
  };
  var y = function() {
    addEventListener("visibilitychange", T, true), addEventListener("prerenderingchange", T, true);
  };
  var E = function() {
    removeEventListener("visibilitychange", T, true), removeEventListener("prerenderingchange", T, true);
  };
  var S = function() {
    return g < 0 && (g = h(), y(), u(function() {
      setTimeout(function() {
        g = h(), y();
      }, 0);
    })), {
      get firstHiddenTime() {
        return g;
      }
    };
  };
  var b = function(t3) {
    document.prerendering ? addEventListener("prerenderingchange", function() {
      return t3();
    }, true) : t3();
  };
  var L = [1800, 3e3];
  var C = function(t3, e2) {
    e2 = e2 || {}, b(function() {
      var n2, r2 = S(), i2 = f("FCP"), a2 = d("paint", function(t4) {
        t4.forEach(function(t5) {
          "first-contentful-paint" === t5.name && (a2.disconnect(), t5.startTime < r2.firstHiddenTime && (i2.value = Math.max(t5.startTime - s(), 0), i2.entries.push(t5), n2(true)));
        });
      });
      a2 && (n2 = l(t3, i2, L, e2.reportAllChanges), u(function(r3) {
        i2 = f("FCP"), n2 = l(t3, i2, L, e2.reportAllChanges), m(function() {
          i2.value = performance.now() - r3.timeStamp, n2(true);
        });
      }));
    });
  };
  var M = [0.1, 0.25];
  var D = function(t3, e2) {
    !function(t4, e3) {
      e3 = e3 || {}, C(v(function() {
        var n2, r2 = f("CLS", 0), i2 = 0, a2 = [], o2 = function(t5) {
          t5.forEach(function(t6) {
            if (!t6.hadRecentInput) {
              var e4 = a2[0], n3 = a2[a2.length - 1];
              i2 && t6.startTime - n3.startTime < 1e3 && t6.startTime - e4.startTime < 5e3 ? (i2 += t6.value, a2.push(t6)) : (i2 = t6.value, a2 = [t6]);
            }
          }), i2 > r2.value && (r2.value = i2, r2.entries = a2, n2());
        }, c2 = d("layout-shift", o2);
        c2 && (n2 = l(t4, r2, M, e3.reportAllChanges), p(function() {
          o2(c2.takeRecords()), n2(true);
        }), u(function() {
          i2 = 0, r2 = f("CLS", 0), n2 = l(t4, r2, M, e3.reportAllChanges), m(function() {
            return n2();
          });
        }), setTimeout(n2, 0));
      }));
    }(function(e3) {
      var n2 = function(t4) {
        var e4, n3 = {};
        if (t4.entries.length) {
          var i2 = t4.entries.reduce(function(t5, e5) {
            return t5 && t5.value > e5.value ? t5 : e5;
          });
          if (i2 && i2.sources && i2.sources.length) {
            var o2 = (e4 = i2.sources).find(function(t5) {
              return t5.node && 1 === t5.node.nodeType;
            }) || e4[0];
            o2 && (n3 = {
              largestShiftTarget: a(o2.node),
              largestShiftTime: i2.startTime,
              largestShiftValue: i2.value,
              largestShiftSource: o2,
              largestShiftEntry: i2,
              loadState: r(i2.startTime)
            });
          }
        }
        return Object.assign(t4, {
          attribution: n3
        });
      }(e3);
      t3(n2);
    }, e2);
  };
  var w = function(t3, e2) {
    C(function(e3) {
      var i2 = function(t4) {
        var e4 = {
          timeToFirstByte: 0,
          firstByteToFCP: t4.value,
          loadState: r(c())
        };
        if (t4.entries.length) {
          var i3 = n(), a2 = t4.entries[t4.entries.length - 1];
          if (i3) {
            var o2 = i3.activationStart || 0, u2 = Math.max(0, i3.responseStart - o2);
            e4 = {
              timeToFirstByte: u2,
              firstByteToFCP: t4.value - u2,
              loadState: r(t4.entries[0].startTime),
              navigationEntry: i3,
              fcpEntry: a2
            };
          }
        }
        return Object.assign(t4, {
          attribution: e4
        });
      }(e3);
      t3(i2);
    }, e2);
  };
  var x = 0;
  var I = 1 / 0;
  var k = 0;
  var A = function(t3) {
    t3.forEach(function(t4) {
      t4.interactionId && (I = Math.min(I, t4.interactionId), k = Math.max(k, t4.interactionId), x = k ? (k - I) / 7 + 1 : 0);
    });
  };
  var F = function() {
    return t ? x : performance.interactionCount || 0;
  };
  var P = function() {
    "interactionCount" in performance || t || (t = d("event", A, {
      type: "event",
      buffered: true,
      durationThreshold: 0
    }));
  };
  var B = [];
  var O = /* @__PURE__ */ new Map();
  var R = 0;
  var j = function() {
    var t3 = Math.min(B.length - 1, Math.floor((F() - R) / 50));
    return B[t3];
  };
  var q = [];
  var H = function(t3) {
    if (q.forEach(function(e3) {
      return e3(t3);
    }), t3.interactionId || "first-input" === t3.entryType) {
      var e2 = B[B.length - 1], n2 = O.get(t3.interactionId);
      if (n2 || B.length < 10 || t3.duration > e2.latency) {
        if (n2) t3.duration > n2.latency ? (n2.entries = [t3], n2.latency = t3.duration) : t3.duration === n2.latency && t3.startTime === n2.entries[0].startTime && n2.entries.push(t3);
        else {
          var r2 = {
            id: t3.interactionId,
            latency: t3.duration,
            entries: [t3]
          };
          O.set(r2.id, r2), B.push(r2);
        }
        B.sort(function(t4, e3) {
          return e3.latency - t4.latency;
        }), B.length > 10 && B.splice(10).forEach(function(t4) {
          return O.delete(t4.id);
        });
      }
    }
  };
  var N = function(t3) {
    var e2 = self.requestIdleCallback || self.setTimeout, n2 = -1;
    return t3 = v(t3), "hidden" === document.visibilityState ? t3() : (n2 = e2(t3), p(t3)), n2;
  };
  var W = [200, 500];
  var z = function(t3, e2) {
    "PerformanceEventTiming" in self && "interactionId" in PerformanceEventTiming.prototype && (e2 = e2 || {}, b(function() {
      var n2;
      P();
      var r2, i2 = f("INP"), a2 = function(t4) {
        N(function() {
          t4.forEach(H);
          var e3 = j();
          e3 && e3.latency !== i2.value && (i2.value = e3.latency, i2.entries = e3.entries, r2());
        });
      }, o2 = d("event", a2, {
        durationThreshold: null !== (n2 = e2.durationThreshold) && void 0 !== n2 ? n2 : 40
      });
      r2 = l(t3, i2, W, e2.reportAllChanges), o2 && (o2.observe({
        type: "first-input",
        buffered: true
      }), p(function() {
        a2(o2.takeRecords()), r2(true);
      }), u(function() {
        R = F(), B.length = 0, O.clear(), i2 = f("INP"), r2 = l(t3, i2, W, e2.reportAllChanges);
      }));
    }));
  };
  var U = [];
  var V = [];
  var _ = 0;
  var G = /* @__PURE__ */ new WeakMap();
  var J = /* @__PURE__ */ new Map();
  var K = -1;
  var Q = function(t3) {
    U = U.concat(t3), X();
  };
  var X = function() {
    K < 0 && (K = N(Y));
  };
  var Y = function() {
    J.size > 10 && J.forEach(function(t4, e3) {
      O.has(e3) || J.delete(e3);
    });
    var t3 = B.map(function(t4) {
      return G.get(t4.entries[0]);
    }), e2 = V.length - 50;
    V = V.filter(function(n3, r3) {
      return r3 >= e2 || t3.includes(n3);
    });
    for (var n2 = /* @__PURE__ */ new Set(), r2 = 0; r2 < V.length; r2++) {
      var i2 = V[r2];
      nt(i2.startTime, i2.processingEnd).forEach(function(t4) {
        n2.add(t4);
      });
    }
    var a2 = U.length - 1 - 50;
    U = U.filter(function(t4, e3) {
      return t4.startTime > _ && e3 > a2 || n2.has(t4);
    }), K = -1;
  };
  q.push(function(t3) {
    t3.interactionId && t3.target && !J.has(t3.interactionId) && J.set(t3.interactionId, t3.target);
  }, function(t3) {
    var e2, n2 = t3.startTime + t3.duration;
    _ = Math.max(_, t3.processingEnd);
    for (var r2 = V.length - 1; r2 >= 0; r2--) {
      var i2 = V[r2];
      if (Math.abs(n2 - i2.renderTime) <= 8) {
        (e2 = i2).startTime = Math.min(t3.startTime, e2.startTime), e2.processingStart = Math.min(t3.processingStart, e2.processingStart), e2.processingEnd = Math.max(t3.processingEnd, e2.processingEnd), e2.entries.push(t3);
        break;
      }
    }
    e2 || (e2 = {
      startTime: t3.startTime,
      processingStart: t3.processingStart,
      processingEnd: t3.processingEnd,
      renderTime: n2,
      entries: [t3]
    }, V.push(e2)), (t3.interactionId || "first-input" === t3.entryType) && G.set(t3, e2), X();
  });
  var Z;
  var $;
  var tt;
  var et;
  var nt = function(t3, e2) {
    for (var n2, r2 = [], i2 = 0; n2 = U[i2]; i2++) if (!(n2.startTime + n2.duration < t3)) {
      if (n2.startTime > e2) break;
      r2.push(n2);
    }
    return r2;
  };
  var rt = function(t3, n2) {
    e || (e = d("long-animation-frame", Q)), z(function(e2) {
      var n3 = function(t4) {
        var e3 = t4.entries[0], n4 = G.get(e3), i2 = e3.processingStart, o2 = n4.processingEnd, c2 = n4.entries.sort(function(t5, e4) {
          return t5.processingStart - e4.processingStart;
        }), u2 = nt(e3.startTime, o2), s2 = t4.entries.find(function(t5) {
          return t5.target;
        }), f2 = s2 && s2.target || J.get(e3.interactionId), d2 = [e3.startTime + e3.duration, o2].concat(u2.map(function(t5) {
          return t5.startTime + t5.duration;
        })), l2 = Math.max.apply(Math, d2), m2 = {
          interactionTarget: a(f2),
          interactionTargetElement: f2,
          interactionType: e3.name.startsWith("key") ? "keyboard" : "pointer",
          interactionTime: e3.startTime,
          nextPaintTime: l2,
          processedEventEntries: c2,
          longAnimationFrameEntries: u2,
          inputDelay: i2 - e3.startTime,
          processingDuration: o2 - i2,
          presentationDelay: Math.max(l2 - o2, 0),
          loadState: r(e3.startTime)
        };
        return Object.assign(t4, {
          attribution: m2
        });
      }(e2);
      t3(n3);
    }, n2);
  };
  var it = [2500, 4e3];
  var at = {};
  var ot = function(t3, e2) {
    !function(t4, e3) {
      e3 = e3 || {}, b(function() {
        var n2, r2 = S(), i2 = f("LCP"), a2 = function(t5) {
          e3.reportAllChanges || (t5 = t5.slice(-1)), t5.forEach(function(t6) {
            t6.startTime < r2.firstHiddenTime && (i2.value = Math.max(t6.startTime - s(), 0), i2.entries = [t6], n2());
          });
        }, o2 = d("largest-contentful-paint", a2);
        if (o2) {
          n2 = l(t4, i2, it, e3.reportAllChanges);
          var c2 = v(function() {
            at[i2.id] || (a2(o2.takeRecords()), o2.disconnect(), at[i2.id] = true, n2(true));
          });
          ["keydown", "click"].forEach(function(t5) {
            addEventListener(t5, function() {
              return N(c2);
            }, {
              once: true,
              capture: true
            });
          }), p(c2), u(function(r3) {
            i2 = f("LCP"), n2 = l(t4, i2, it, e3.reportAllChanges), m(function() {
              i2.value = performance.now() - r3.timeStamp, at[i2.id] = true, n2(true);
            });
          });
        }
      });
    }(function(e3) {
      var r2 = function(t4) {
        var e4 = {
          timeToFirstByte: 0,
          resourceLoadDelay: 0,
          resourceLoadDuration: 0,
          elementRenderDelay: t4.value
        };
        if (t4.entries.length) {
          var r3 = n();
          if (r3) {
            var i2 = r3.activationStart || 0, o2 = t4.entries[t4.entries.length - 1], c2 = o2.url && performance.getEntriesByType("resource").filter(function(t5) {
              return t5.name === o2.url;
            })[0], u2 = Math.max(0, r3.responseStart - i2), s2 = Math.max(u2, c2 ? (c2.requestStart || c2.startTime) - i2 : 0), f2 = Math.max(s2, c2 ? c2.responseEnd - i2 : 0), d2 = Math.max(f2, o2.startTime - i2);
            e4 = {
              element: a(o2.element),
              timeToFirstByte: u2,
              resourceLoadDelay: s2 - u2,
              resourceLoadDuration: f2 - s2,
              elementRenderDelay: d2 - f2,
              navigationEntry: r3,
              lcpEntry: o2
            }, o2.url && (e4.url = o2.url), c2 && (e4.lcpResourceEntry = c2);
          }
        }
        return Object.assign(t4, {
          attribution: e4
        });
      }(e3);
      t3(r2);
    }, e2);
  };
  var ct = [800, 1800];
  var ut = function t2(e2) {
    document.prerendering ? b(function() {
      return t2(e2);
    }) : "complete" !== document.readyState ? addEventListener("load", function() {
      return t2(e2);
    }, true) : setTimeout(e2, 0);
  };
  var st = function(t3, e2) {
    e2 = e2 || {};
    var r2 = f("TTFB"), i2 = l(t3, r2, ct, e2.reportAllChanges);
    ut(function() {
      var a2 = n();
      a2 && (r2.value = Math.max(a2.responseStart - s(), 0), r2.entries = [a2], i2(true), u(function() {
        r2 = f("TTFB", 0), (i2 = l(t3, r2, ct, e2.reportAllChanges))(true);
      }));
    });
  };
  var ft = function(t3, e2) {
    st(function(e3) {
      var n2 = function(t4) {
        var e4 = {
          waitingDuration: 0,
          cacheDuration: 0,
          dnsDuration: 0,
          connectionDuration: 0,
          requestDuration: 0
        };
        if (t4.entries.length) {
          var n3 = t4.entries[0], r2 = n3.activationStart || 0, i2 = Math.max((n3.workerStart || n3.fetchStart) - r2, 0), a2 = Math.max(n3.domainLookupStart - r2, 0), o2 = Math.max(n3.connectStart - r2, 0), c2 = Math.max(n3.connectEnd - r2, 0);
          e4 = {
            waitingDuration: i2,
            cacheDuration: a2 - i2,
            dnsDuration: o2 - a2,
            connectionDuration: c2 - o2,
            requestDuration: t4.value - c2,
            navigationEntry: n3
          };
        }
        return Object.assign(t4, {
          attribution: e4
        });
      }(e3);
      t3(n2);
    }, e2);
  };
  var dt = {
    passive: true,
    capture: true
  };
  var lt = /* @__PURE__ */ new Date();
  var mt = function(t3, e2) {
    Z || (Z = e2, $ = t3, tt = /* @__PURE__ */ new Date(), gt(removeEventListener), pt());
  };
  var pt = function() {
    if ($ >= 0 && $ < tt - lt) {
      var t3 = {
        entryType: "first-input",
        name: Z.type,
        target: Z.target,
        cancelable: Z.cancelable,
        startTime: Z.timeStamp,
        processingStart: Z.timeStamp + $
      };
      et.forEach(function(e2) {
        e2(t3);
      }), et = [];
    }
  };
  var vt = function(t3) {
    if (t3.cancelable) {
      var e2 = (t3.timeStamp > 1e12 ? /* @__PURE__ */ new Date() : performance.now()) - t3.timeStamp;
      "pointerdown" == t3.type ? function(t4, e3) {
        var n2 = function() {
          mt(t4, e3), i2();
        }, r2 = function() {
          i2();
        }, i2 = function() {
          removeEventListener("pointerup", n2, dt), removeEventListener("pointercancel", r2, dt);
        };
        addEventListener("pointerup", n2, dt), addEventListener("pointercancel", r2, dt);
      }(e2, t3) : mt(e2, t3);
    }
  };
  var gt = function(t3) {
    ["mousedown", "keydown", "touchstart", "pointerdown"].forEach(function(e2) {
      return t3(e2, vt, dt);
    });
  };
  var ht = [100, 300];
  var Tt = function(t3, e2) {
    e2 = e2 || {}, b(function() {
      var n2, r2 = S(), i2 = f("FID"), a2 = function(t4) {
        t4.startTime < r2.firstHiddenTime && (i2.value = t4.processingStart - t4.startTime, i2.entries.push(t4), n2(true));
      }, o2 = function(t4) {
        t4.forEach(a2);
      }, c2 = d("first-input", o2);
      n2 = l(t3, i2, ht, e2.reportAllChanges), c2 && (p(v(function() {
        o2(c2.takeRecords()), c2.disconnect();
      })), u(function() {
        var r3;
        i2 = f("FID"), n2 = l(t3, i2, ht, e2.reportAllChanges), et = [], $ = -1, Z = null, gt(addEventListener), r3 = a2, et.push(r3), pt();
      }));
    });
  };
  var yt = function(t3, e2) {
    Tt(function(e3) {
      var n2 = function(t4) {
        var e4 = t4.entries[0], n3 = {
          eventTarget: a(e4.target),
          eventType: e4.name,
          eventTime: e4.startTime,
          eventEntry: e4,
          loadState: r(e4.startTime)
        };
        return Object.assign(t4, {
          attribution: n3
        });
      }(e3);
      t3(n2);
    }, e2);
  };
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
      fid,
      fcp,
      ttfb
    } = {}) {
      const config = {
        enabled,
        vitalsToTrack,
        lcp,
        cls,
        inp,
        fid,
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
        const attrPrefix = this.getAttrPrefix(name);
        const span = this.tracer.startSpan(name);
        span.setAttributes(Object.assign(Object.assign({}, this.getSharedAttributes(cls2)), {
          [`${attrPrefix}.largest_shift_target`]: largestShiftTarget,
          [`${attrPrefix}.element`]: largestShiftTarget,
          [`${attrPrefix}.largest_shift_time`]: largestShiftTime,
          [`${attrPrefix}.largest_shift_value`]: largestShiftValue,
          [`${attrPrefix}.load_state`]: loadState,
          [`${attrPrefix}.had_recent_input`]: largestShiftEntry === null || largestShiftEntry === void 0 ? void 0 : largestShiftEntry.hadRecentInput
        }));
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
          element,
          url,
          timeToFirstByte,
          resourceLoadDelay,
          resourceLoadDuration,
          elementRenderDelay,
          lcpEntry
        } = attribution;
        const attrPrefix = this.getAttrPrefix(name);
        const span = this.tracer.startSpan(name);
        span.setAttributes(Object.assign(Object.assign({}, this.getSharedAttributes(lcp2)), {
          [`${attrPrefix}.element`]: element,
          [`${attrPrefix}.url`]: url,
          [`${attrPrefix}.time_to_first_byte`]: timeToFirstByte,
          [`${attrPrefix}.resource_load_delay`]: resourceLoadDelay,
          [`${attrPrefix}.resource_load_duration`]: resourceLoadDuration,
          [`${attrPrefix}.element_render_delay`]: elementRenderDelay,
          // This will be deprecated in a future version
          [`${attrPrefix}.resource_load_time`]: resourceLoadDuration
        }));
        const el = lcpEntry === null || lcpEntry === void 0 ? void 0 : lcpEntry.element;
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
          includeTimingsAsSpans
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
          longAnimationFrameEntries: _loafEntries
        } = attribution;
        const longAnimationFrameEntries = _loafEntries;
        const attrPrefix = this.getAttrPrefix(name);
        const inpDuration = inputDelay + processingDuration + presentationDelay;
        this.tracer.startActiveSpan(name, {
          startTime: interactionTime
        }, (inpSpan) => {
          const inpAttributes = Object.assign(Object.assign({}, this.getSharedAttributes(inp2)), {
            [`${attrPrefix}.input_delay`]: inputDelay,
            [`${attrPrefix}.interaction_target`]: interactionTarget,
            [`${attrPrefix}.interaction_time`]: interactionTime,
            [`${attrPrefix}.interaction_type`]: interactionType,
            [`${attrPrefix}.load_state`]: loadState,
            [`${attrPrefix}.next_paint_time`]: nextPaintTime,
            [`${attrPrefix}.presentation_delay`]: presentationDelay,
            [`${attrPrefix}.processing_duration`]: processingDuration,
            [`${attrPrefix}.duration`]: inpDuration,
            // These will be deprecated in a future version
            [`${attrPrefix}.element`]: interactionTarget,
            [`${attrPrefix}.event_type`]: interactionType
          });
          inpSpan.setAttributes(inpAttributes);
          if (applyCustomAttributes) {
            applyCustomAttributes(inp2, inpSpan);
          }
          if (includeTimingsAsSpans) {
            longAnimationFrameEntries.forEach((perfEntry) => {
              this.processPerformanceLongAnimationFrameTimingSpans(attrPrefix, perfEntry);
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
        const attrPrefix = this.getAttrPrefix(name);
        const span = this.tracer.startSpan(name);
        span.setAttributes(Object.assign(Object.assign({}, this.getSharedAttributes(fcp2)), {
          [`${attrPrefix}.time_to_first_byte`]: timeToFirstByte,
          [`${attrPrefix}.time_since_first_byte`]: firstByteToFCP,
          [`${attrPrefix}.load_state`]: loadState
        }));
        if (applyCustomAttributes) {
          applyCustomAttributes(fcp2, span);
        }
        span.end();
      };
      this.onReportFID = (fid2, fidOpts = {}) => {
        const {
          applyCustomAttributes
        } = fidOpts;
        if (!this.isEnabled()) return;
        const {
          name,
          attribution
        } = fid2;
        const {
          eventTarget,
          eventType,
          loadState
        } = attribution;
        const attrPrefix = this.getAttrPrefix(name);
        const span = this.tracer.startSpan(name);
        span.setAttributes(Object.assign(Object.assign({}, this.getSharedAttributes(fid2)), {
          [`${attrPrefix}.element`]: eventTarget,
          [`${attrPrefix}.event_type`]: eventType,
          [`${attrPrefix}.load_state`]: loadState
        }));
        if (applyCustomAttributes) {
          applyCustomAttributes(fid2, span);
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
        const attrPrefix = this.getAttrPrefix(name);
        const attributes = Object.assign(Object.assign({}, this.getSharedAttributes(ttfb2)), {
          [`${attrPrefix}.waiting_duration`]: waitingDuration,
          [`${attrPrefix}.dns_duration`]: dnsDuration,
          [`${attrPrefix}.connection_duration`]: connectionDuration,
          [`${attrPrefix}.request_duration`]: requestDuration,
          [`${attrPrefix}.cache_duration`]: cacheDuration,
          // These will be deprecated ina future version
          [`${attrPrefix}.waiting_time`]: waitingDuration,
          [`${attrPrefix}.dns_time`]: dnsDuration,
          [`${attrPrefix}.connection_time`]: connectionDuration,
          [`${attrPrefix}.request_time`]: requestDuration
        });
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
      this.fidOpts = fid;
      this.fcpOpts = fcp;
      this.ttfbOpts = ttfb;
      this._isEnabled = enabled;
      this._setupWebVitalsCallbacks();
    }
    init() {
    }
    _setupWebVitalsCallbacks() {
      if (this.vitalsToTrack.includes("CLS")) {
        D((vital) => {
          this.onReportCLS(vital, this.clsOpts);
        }, this.clsOpts);
      }
      if (this.vitalsToTrack.includes("LCP")) {
        ot((vital) => {
          this.onReportLCP(vital, this.lcpOpts);
        }, this.lcpOpts);
      }
      if (this.vitalsToTrack.includes("INP")) {
        rt((vital) => {
          this.onReportINP(vital, this.inpOpts);
        }, this.inpOpts);
      }
      if (this.vitalsToTrack.includes("FID")) {
        yt((vital) => {
          this.onReportFID(vital, this.fidOpts);
        }, this.fidOpts);
      }
      if (this.vitalsToTrack.includes("TTFB")) {
        ft((vital) => {
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
    getSharedAttributes(vital) {
      const {
        name,
        id,
        delta,
        rating,
        value,
        navigationType
      } = vital;
      const attrPrefix = this.getAttrPrefix(name);
      return {
        [`${attrPrefix}.id`]: id,
        [`${attrPrefix}.delta`]: delta,
        [`${attrPrefix}.value`]: value,
        [`${attrPrefix}.rating`]: rating,
        [`${attrPrefix}.navigation_type`]: navigationType
      };
    }
    getAttributesForPerformanceLongAnimationFrameTiming(prefix, perfEntry) {
      const loafAttributes = {
        [`${prefix}.duration`]: perfEntry.duration,
        [`${prefix}.entryType`]: perfEntry.entryType,
        [`${prefix}.name`]: perfEntry.name,
        [`${prefix}.renderStart`]: perfEntry.renderStart,
        [`${prefix}.startTime`]: perfEntry.startTime
      };
      return loafAttributes;
    }
    getAttributesForPerformanceScriptTiming(prefix, scriptPerfEntry) {
      const scriptAttributes = {
        [`${prefix}.entry_type`]: scriptPerfEntry.entryType,
        [`${prefix}.start_time`]: scriptPerfEntry.startTime,
        [`${prefix}.execution_start`]: scriptPerfEntry.executionStart,
        [`${prefix}.duration`]: scriptPerfEntry.duration,
        [`${prefix}.forced_style_and_layout_duration`]: scriptPerfEntry.forcedStyleAndLayoutDuration,
        [`${prefix}.invoker`]: scriptPerfEntry.invoker,
        [`${prefix}.pause_duration`]: scriptPerfEntry.pauseDuration,
        [`${prefix}.source_url`]: scriptPerfEntry.sourceURL,
        [`${prefix}.source_function_name`]: scriptPerfEntry.sourceFunctionName,
        [`${prefix}.source_char_position`]: scriptPerfEntry.sourceCharPosition,
        [`${prefix}.window_attribution`]: scriptPerfEntry.windowAttribution
      };
      return scriptAttributes;
    }
    processPerformanceLongAnimationFrameTimingSpans(parentPrefix, perfEntry) {
      if (!perfEntry) return;
      const prefix = `${parentPrefix}.timing`;
      const loafAttributes = this.getAttributesForPerformanceLongAnimationFrameTiming(prefix, perfEntry);
      this.tracer.startActiveSpan(perfEntry.name, {
        startTime: perfEntry.startTime
      }, (span) => {
        span.setAttributes(loafAttributes);
        this.processPerformanceScriptTimingSpans(prefix, perfEntry.scripts);
        span.end(perfEntry.startTime + perfEntry.duration);
      });
    }
    processPerformanceScriptTimingSpans(parentPrefix, perfScriptEntries) {
      if (!perfScriptEntries) return;
      if (!(perfScriptEntries === null || perfScriptEntries === void 0 ? void 0 : perfScriptEntries.length)) return;
      const prefix = `${parentPrefix}.script`;
      perfScriptEntries.map((scriptPerfEntry) => {
        this.tracer.startActiveSpan(scriptPerfEntry.name, {
          startTime: scriptPerfEntry.startTime
        }, (span) => {
          const scriptAttributes = this.getAttributesForPerformanceScriptTiming(prefix, scriptPerfEntry);
          span.setAttributes(scriptAttributes);
          span.end(scriptPerfEntry.startTime + scriptPerfEntry.duration);
        });
      });
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
  var HoneycombWebSDK = class extends WebSDK {
    constructor(options) {
      var _a3, _b;
      const instrumentations = [...(options === null || options === void 0 ? void 0 : options.instrumentations) || []];
      if (((_a3 = options === null || options === void 0 ? void 0 : options.webVitalsInstrumentationConfig) === null || _a3 === void 0 ? void 0 : _a3.enabled) !== false) {
        instrumentations.push(new WebVitalsInstrumentation(options === null || options === void 0 ? void 0 : options.webVitalsInstrumentationConfig));
      }
      if (((_b = options === null || options === void 0 ? void 0 : options.globalErrorsInstrumentationConfig) === null || _b === void 0 ? void 0 : _b.enabled) !== false) {
        instrumentations.push(new GlobalErrorsInstrumentation(options === null || options === void 0 ? void 0 : options.globalErrorsInstrumentationConfig));
      }
      super(Object.assign(Object.assign({}, options), {
        instrumentations,
        resource: mergeResources([configureBrowserAttributesResource(), configureEntryPageResource(options === null || options === void 0 ? void 0 : options.entryPageAttributes), options === null || options === void 0 ? void 0 : options.resource, options === null || options === void 0 ? void 0 : options.resourceAttributes, configureHoneycombResource()]),
        sampler: configureDeterministicSampler(options),
        // Exporter is configured through the span processor because
        // the base SDK does not allow having both a spanProcessor and a
        // traceExporter configured at the same time.
        spanProcessor: configureSpanProcessors(options)
      }));
      validateOptionsWarnings(options);
      if (options === null || options === void 0 ? void 0 : options.debug) {
        configureDebug(options);
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/AttributeNames.js
  var AttributeNames;
  (function(AttributeNames5) {
    AttributeNames5["DOCUMENT_LOAD"] = "documentLoad";
    AttributeNames5["DOCUMENT_FETCH"] = "documentFetch";
    AttributeNames5["RESOURCE_FETCH"] = "resourceFetch";
  })(AttributeNames || (AttributeNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/version.js
  var PACKAGE_VERSION = "0.44.0";
  var PACKAGE_NAME = "@opentelemetry/instrumentation-document-load";

  // node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_HTTP_URL = "http.url";
  var TMP_HTTP_USER_AGENT = "http.user_agent";
  var SEMATTRS_HTTP_URL = TMP_HTTP_URL;
  var SEMATTRS_HTTP_USER_AGENT = TMP_HTTP_USER_AGENT;

  // node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
  var ATTR_EXCEPTION_MESSAGE2 = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE2 = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE2 = "exception.type";

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/EventNames.js
  var EventNames;
  (function(EventNames3) {
    EventNames3["FIRST_PAINT"] = "firstPaint";
    EventNames3["FIRST_CONTENTFUL_PAINT"] = "firstContentfulPaint";
  })(EventNames || (EventNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/utils.js
  var getPerformanceNavigationEntries = function() {
    var _a3, _b;
    var entries = {};
    var performanceNavigationTiming = (_b = (_a3 = otperformance).getEntriesByType) === null || _b === void 0 ? void 0 : _b.call(_a3, "navigation")[0];
    if (performanceNavigationTiming) {
      var keys = Object.values(PerformanceTimingNames);
      keys.forEach(function(key) {
        if (hasKey(performanceNavigationTiming, key)) {
          var value = performanceNavigationTiming[key];
          if (typeof value === "number") {
            entries[key] = value;
          }
        }
      });
    } else {
      var perf = otperformance;
      var performanceTiming_1 = perf.timing;
      if (performanceTiming_1) {
        var keys = Object.values(PerformanceTimingNames);
        keys.forEach(function(key) {
          if (hasKey(performanceTiming_1, key)) {
            var value = performanceTiming_1[key];
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
  var addSpanPerformancePaintEvents = function(span) {
    var _a3, _b;
    var performancePaintTiming = (_b = (_a3 = otperformance).getEntriesByType) === null || _b === void 0 ? void 0 : _b.call(_a3, "paint");
    if (performancePaintTiming) {
      performancePaintTiming.forEach(function(_a4) {
        var name = _a4.name, startTime = _a4.startTime;
        if (hasKey(performancePaintNames, name)) {
          span.addEvent(performancePaintNames[name], startTime);
        }
      });
    }
  };

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/instrumentation.js
  var __extends7 = /* @__PURE__ */ function() {
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
  var DocumentLoadInstrumentation = (
    /** @class */
    function(_super) {
      __extends7(DocumentLoadInstrumentation2, _super);
      function DocumentLoadInstrumentation2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, PACKAGE_NAME, PACKAGE_VERSION, config) || this;
        _this.component = "document-load";
        _this.version = "1";
        _this.moduleName = _this.component;
        return _this;
      }
      DocumentLoadInstrumentation2.prototype.init = function() {
      };
      DocumentLoadInstrumentation2.prototype._onDocumentLoaded = function() {
        var _this = this;
        window.setTimeout(function() {
          _this._collectPerformance();
        });
      };
      DocumentLoadInstrumentation2.prototype._addResourcesSpans = function(rootSpan) {
        var _this = this;
        var _a3, _b;
        var resources = (_b = (_a3 = otperformance).getEntriesByType) === null || _b === void 0 ? void 0 : _b.call(_a3, "resource");
        if (resources) {
          resources.forEach(function(resource) {
            _this._initResourceSpan(resource, rootSpan);
          });
        }
      };
      DocumentLoadInstrumentation2.prototype._collectPerformance = function() {
        var _this = this;
        var metaElement = Array.from(document.getElementsByTagName("meta")).find(function(e2) {
          return e2.getAttribute("name") === TRACE_PARENT_HEADER;
        });
        var entries = getPerformanceNavigationEntries();
        var traceparent = metaElement && metaElement.content || "";
        context.with(propagation.extract(ROOT_CONTEXT, { traceparent }), function() {
          var _a3;
          var rootSpan = _this._startSpan(AttributeNames.DOCUMENT_LOAD, PerformanceTimingNames.FETCH_START, entries);
          if (!rootSpan) {
            return;
          }
          context.with(trace.setSpan(context.active(), rootSpan), function() {
            var fetchSpan = _this._startSpan(AttributeNames.DOCUMENT_FETCH, PerformanceTimingNames.FETCH_START, entries);
            if (fetchSpan) {
              fetchSpan.setAttribute(SEMATTRS_HTTP_URL, location.href);
              context.with(trace.setSpan(context.active(), fetchSpan), function() {
                var _a4;
                if (!_this.getConfig().ignoreNetworkEvents) {
                  addSpanNetworkEvents(fetchSpan, entries);
                }
                _this._addCustomAttributesOnSpan(fetchSpan, (_a4 = _this.getConfig().applyCustomAttributesOnSpan) === null || _a4 === void 0 ? void 0 : _a4.documentFetch);
                _this._endSpan(fetchSpan, PerformanceTimingNames.RESPONSE_END, entries);
              });
            }
          });
          rootSpan.setAttribute(SEMATTRS_HTTP_URL, location.href);
          rootSpan.setAttribute(SEMATTRS_HTTP_USER_AGENT, navigator.userAgent);
          _this._addResourcesSpans(rootSpan);
          if (!_this.getConfig().ignoreNetworkEvents) {
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
          if (!_this.getConfig().ignorePerformancePaintEvents) {
            addSpanPerformancePaintEvents(rootSpan);
          }
          _this._addCustomAttributesOnSpan(rootSpan, (_a3 = _this.getConfig().applyCustomAttributesOnSpan) === null || _a3 === void 0 ? void 0 : _a3.documentLoad);
          _this._endSpan(rootSpan, PerformanceTimingNames.LOAD_EVENT_END, entries);
        });
      };
      DocumentLoadInstrumentation2.prototype._endSpan = function(span, performanceName, entries) {
        if (span) {
          if (hasKey(entries, performanceName)) {
            span.end(entries[performanceName]);
          } else {
            span.end();
          }
        }
      };
      DocumentLoadInstrumentation2.prototype._initResourceSpan = function(resource, parentSpan) {
        var _a3;
        var span = this._startSpan(AttributeNames.RESOURCE_FETCH, PerformanceTimingNames.FETCH_START, resource, parentSpan);
        if (span) {
          span.setAttribute(SEMATTRS_HTTP_URL, resource.name);
          if (!this.getConfig().ignoreNetworkEvents) {
            addSpanNetworkEvents(span, resource);
          }
          this._addCustomAttributesOnResourceSpan(span, resource, (_a3 = this.getConfig().applyCustomAttributesOnSpan) === null || _a3 === void 0 ? void 0 : _a3.resourceFetch);
          this._endSpan(span, PerformanceTimingNames.RESPONSE_END, resource);
        }
      };
      DocumentLoadInstrumentation2.prototype._startSpan = function(spanName, performanceName, entries, parentSpan) {
        if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number") {
          var span = this.tracer.startSpan(spanName, {
            startTime: entries[performanceName]
          }, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
          return span;
        }
        return void 0;
      };
      DocumentLoadInstrumentation2.prototype._waitForPageLoad = function() {
        if (window.document.readyState === "complete") {
          this._onDocumentLoaded();
        } else {
          this._onDocumentLoaded = this._onDocumentLoaded.bind(this);
          window.addEventListener("load", this._onDocumentLoaded);
        }
      };
      DocumentLoadInstrumentation2.prototype._addCustomAttributesOnSpan = function(span, applyCustomAttributesOnSpan) {
        var _this = this;
        if (applyCustomAttributesOnSpan) {
          safeExecuteInTheMiddle(function() {
            return applyCustomAttributesOnSpan(span);
          }, function(error) {
            if (!error) {
              return;
            }
            _this._diag.error("addCustomAttributesOnSpan", error);
          }, true);
        }
      };
      DocumentLoadInstrumentation2.prototype._addCustomAttributesOnResourceSpan = function(span, resource, applyCustomAttributesOnSpan) {
        var _this = this;
        if (applyCustomAttributesOnSpan) {
          safeExecuteInTheMiddle(function() {
            return applyCustomAttributesOnSpan(span, resource);
          }, function(error) {
            if (!error) {
              return;
            }
            _this._diag.error("addCustomAttributesOnResourceSpan", error);
          }, true);
        }
      };
      DocumentLoadInstrumentation2.prototype.enable = function() {
        window.removeEventListener("load", this._onDocumentLoaded);
        this._waitForPageLoad();
      };
      DocumentLoadInstrumentation2.prototype.disable = function() {
        window.removeEventListener("load", this._onDocumentLoaded);
      };
      return DocumentLoadInstrumentation2;
    }(InstrumentationBase)
  );

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/enums/AttributeNames.js
  var AttributeNames2;
  (function(AttributeNames5) {
    AttributeNames5["COMPONENT"] = "component";
    AttributeNames5["HTTP_ERROR_NAME"] = "http.error_name";
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames2 || (AttributeNames2 = {}));

  // node_modules/@opentelemetry/instrumentation-fetch/node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_HTTP_METHOD = "http.method";
  var TMP_HTTP_URL2 = "http.url";
  var TMP_HTTP_HOST = "http.host";
  var TMP_HTTP_SCHEME = "http.scheme";
  var TMP_HTTP_STATUS_CODE = "http.status_code";
  var TMP_HTTP_USER_AGENT2 = "http.user_agent";
  var TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = "http.request_content_length_uncompressed";
  var SEMATTRS_HTTP_METHOD = TMP_HTTP_METHOD;
  var SEMATTRS_HTTP_URL2 = TMP_HTTP_URL2;
  var SEMATTRS_HTTP_HOST = TMP_HTTP_HOST;
  var SEMATTRS_HTTP_SCHEME = TMP_HTTP_SCHEME;
  var SEMATTRS_HTTP_STATUS_CODE = TMP_HTTP_STATUS_CODE;
  var SEMATTRS_HTTP_USER_AGENT2 = TMP_HTTP_USER_AGENT2;
  var SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED;

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/utils.js
  var __awaiter7 = function(thisArg, _arguments, P2, generator) {
    function adopt(value) {
      return value instanceof P2 ? value : new P2(function(resolve) {
        resolve(value);
      });
    }
    return new (P2 || (P2 = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e2) {
          reject(e2);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator7 = function(thisArg, body) {
    var _2 = { label: 0, sent: function() {
      if (t3[0] & 1) throw t3[1];
      return t3[1];
    }, trys: [], ops: [] }, f2, y2, t3, g2;
    return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
      return this;
    }), g2;
    function verb(n2) {
      return function(v2) {
        return step([n2, v2]);
      };
    }
    function step(op) {
      if (f2) throw new TypeError("Generator is already executing.");
      while (_2) try {
        if (f2 = 1, y2 && (t3 = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t3 = y2["return"]) && t3.call(y2), 0) : y2.next) && !(t3 = t3.call(y2, op[1])).done) return t3;
        if (y2 = 0, t3) op = [op[0] & 2, t3.value];
        switch (op[0]) {
          case 0:
          case 1:
            t3 = op;
            break;
          case 4:
            _2.label++;
            return { value: op[1], done: false };
          case 5:
            _2.label++;
            y2 = op[1];
            op = [0];
            continue;
          case 7:
            op = _2.ops.pop();
            _2.trys.pop();
            continue;
          default:
            if (!(t3 = _2.trys, t3 = t3.length > 0 && t3[t3.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _2 = 0;
              continue;
            }
            if (op[0] === 3 && (!t3 || op[1] > t3[0] && op[1] < t3[3])) {
              _2.label = op[1];
              break;
            }
            if (op[0] === 6 && _2.label < t3[1]) {
              _2.label = t3[1];
              t3 = op;
              break;
            }
            if (t3 && _2.label < t3[2]) {
              _2.label = t3[2];
              _2.ops.push(op);
              break;
            }
            if (t3[2]) _2.ops.pop();
            _2.trys.pop();
            continue;
        }
        op = body.call(thisArg, _2);
      } catch (e2) {
        op = [6, e2];
        y2 = 0;
      } finally {
        f2 = t3 = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var __values8 = function(o2) {
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
  var __read17 = function(o2, n2) {
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
  var DIAG_LOGGER = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-fetch/utils"
  });
  function getFetchBodyLength() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (args[0] instanceof URL || typeof args[0] === "string") {
      var requestInit = args[1];
      if (!(requestInit === null || requestInit === void 0 ? void 0 : requestInit.body)) {
        return Promise.resolve();
      }
      if (requestInit.body instanceof ReadableStream) {
        var _a3 = _getBodyNonDestructively(requestInit.body), body = _a3.body, length_1 = _a3.length;
        requestInit.body = body;
        return length_1;
      } else {
        return Promise.resolve(getXHRBodyLength(requestInit.body));
      }
    } else {
      var info = args[0];
      if (!(info === null || info === void 0 ? void 0 : info.body)) {
        return Promise.resolve();
      }
      return info.clone().text().then(function(t3) {
        return getByteLength(t3);
      });
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
    var length = 0;
    var resolveLength;
    var lengthPromise = new Promise(function(resolve) {
      resolveLength = resolve;
    });
    var transform = new TransformStream({
      start: function() {
      },
      transform: function(chunk, controller) {
        return __awaiter7(this, void 0, void 0, function() {
          var bytearray;
          return __generator7(this, function(_a3) {
            switch (_a3.label) {
              case 0:
                return [4, chunk];
              case 1:
                bytearray = _a3.sent();
                length += bytearray.byteLength;
                controller.enqueue(chunk);
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      },
      flush: function() {
        resolveLength(length);
      }
    });
    return {
      body: body.pipeThrough(transform),
      length: lengthPromise
    };
  }
  function getXHRBodyLength(body) {
    if (typeof Document !== "undefined" && body instanceof Document) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    if (body instanceof FormData) {
      return getFormDataSize(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength(body.toString());
    }
    if (typeof body === "string") {
      return getByteLength(body);
    }
    DIAG_LOGGER.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER = new TextEncoder();
  function getByteLength(s2) {
    return TEXT_ENCODER.encode(s2).byteLength;
  }
  function getFormDataSize(formData) {
    var e_1, _a3;
    var size = 0;
    try {
      for (var _b = __values8(formData.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read17(_c.value, 2), key = _d[0], value = _d[1];
        size += key.length;
        if (value instanceof Blob) {
          size += value.size;
        } else {
          size += value.length;
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return size;
  }

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/version.js
  var VERSION5 = "0.57.2";

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/fetch.js
  var __extends8 = /* @__PURE__ */ function() {
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
  var __read18 = function(o2, n2) {
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
  var __spreadArray9 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var _a2;
  var OBSERVER_WAIT_TIME_MS = 300;
  var isNode = typeof process === "object" && ((_a2 = process.release) === null || _a2 === void 0 ? void 0 : _a2.name) === "node";
  var FetchInstrumentation = (
    /** @class */
    function(_super) {
      __extends8(FetchInstrumentation2, _super);
      function FetchInstrumentation2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, "@opentelemetry/instrumentation-fetch", VERSION5, config) || this;
        _this.component = "fetch";
        _this.version = VERSION5;
        _this.moduleName = _this.component;
        _this._usedResources = /* @__PURE__ */ new WeakSet();
        _this._tasksCount = 0;
        return _this;
      }
      FetchInstrumentation2.prototype.init = function() {
      };
      FetchInstrumentation2.prototype._addChildSpan = function(span, corsPreFlightRequest) {
        var childSpan = this.tracer.startSpan("CORS Preflight", {
          startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
        }, trace.setSpan(context.active(), span));
        addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents);
        childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
      };
      FetchInstrumentation2.prototype._addFinalSpanAttributes = function(span, response) {
        var parsedUrl = parseUrl(response.url);
        span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response.status);
        if (response.statusText != null) {
          span.setAttribute(AttributeNames2.HTTP_STATUS_TEXT, response.statusText);
        }
        span.setAttribute(SEMATTRS_HTTP_HOST, parsedUrl.host);
        span.setAttribute(SEMATTRS_HTTP_SCHEME, parsedUrl.protocol.replace(":", ""));
        if (typeof navigator !== "undefined") {
          span.setAttribute(SEMATTRS_HTTP_USER_AGENT2, navigator.userAgent);
        }
      };
      FetchInstrumentation2.prototype._addHeaders = function(options, spanUrl) {
        if (!shouldPropagateTraceHeaders(spanUrl, this.getConfig().propagateTraceHeaderCorsUrls)) {
          var headers = {};
          propagation.inject(context.active(), headers);
          if (Object.keys(headers).length > 0) {
            this._diag.debug("headers inject skipped due to CORS policy");
          }
          return;
        }
        if (options instanceof Request) {
          propagation.inject(context.active(), options.headers, {
            set: function(h2, k2, v2) {
              return h2.set(k2, typeof v2 === "string" ? v2 : String(v2));
            }
          });
        } else if (options.headers instanceof Headers) {
          propagation.inject(context.active(), options.headers, {
            set: function(h2, k2, v2) {
              return h2.set(k2, typeof v2 === "string" ? v2 : String(v2));
            }
          });
        } else if (options.headers instanceof Map) {
          propagation.inject(context.active(), options.headers, {
            set: function(h2, k2, v2) {
              return h2.set(k2, typeof v2 === "string" ? v2 : String(v2));
            }
          });
        } else {
          var headers = {};
          propagation.inject(context.active(), headers);
          options.headers = Object.assign({}, headers, options.headers || {});
        }
      };
      FetchInstrumentation2.prototype._clearResources = function() {
        if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
          performance.clearResourceTimings();
          this._usedResources = /* @__PURE__ */ new WeakSet();
        }
      };
      FetchInstrumentation2.prototype._createSpan = function(url, options) {
        var _a3;
        if (options === void 0) {
          options = {};
        }
        if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
          this._diag.debug("ignoring span as url matches ignored url");
          return;
        }
        var method = (options.method || "GET").toUpperCase();
        var spanName = "HTTP " + method;
        return this.tracer.startSpan(spanName, {
          kind: SpanKind.CLIENT,
          attributes: (_a3 = {}, _a3[AttributeNames2.COMPONENT] = this.moduleName, _a3[SEMATTRS_HTTP_METHOD] = method, _a3[SEMATTRS_HTTP_URL2] = url, _a3)
        });
      };
      FetchInstrumentation2.prototype._findResourceAndAddNetworkEvents = function(span, resourcesObserver, endTime) {
        var resources = resourcesObserver.entries;
        if (!resources.length) {
          if (!performance.getEntriesByType) {
            return;
          }
          resources = performance.getEntriesByType("resource");
        }
        var resource = getResource(resourcesObserver.spanUrl, resourcesObserver.startTime, endTime, resources, this._usedResources, "fetch");
        if (resource.mainRequest) {
          var mainRequest = resource.mainRequest;
          this._markResourceAsUsed(mainRequest);
          var corsPreFlightRequest = resource.corsPreFlightRequest;
          if (corsPreFlightRequest) {
            this._addChildSpan(span, corsPreFlightRequest);
            this._markResourceAsUsed(corsPreFlightRequest);
          }
          addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents);
        }
      };
      FetchInstrumentation2.prototype._markResourceAsUsed = function(resource) {
        this._usedResources.add(resource);
      };
      FetchInstrumentation2.prototype._endSpan = function(span, spanData, response) {
        var _this = this;
        var endTime = millisToHrTime(Date.now());
        var performanceEndTime = hrTime();
        this._addFinalSpanAttributes(span, response);
        setTimeout(function() {
          var _a3;
          (_a3 = spanData.observer) === null || _a3 === void 0 ? void 0 : _a3.disconnect();
          _this._findResourceAndAddNetworkEvents(span, spanData, performanceEndTime);
          _this._tasksCount--;
          _this._clearResources();
          span.end(endTime);
        }, OBSERVER_WAIT_TIME_MS);
      };
      FetchInstrumentation2.prototype._patchConstructor = function() {
        var _this = this;
        return function(original) {
          var plugin = _this;
          return function patchConstructor() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var self2 = this;
            var url = parseUrl(args[0] instanceof Request ? args[0].url : String(args[0])).href;
            var options = args[0] instanceof Request ? args[0] : args[1] || {};
            var createdSpan = plugin._createSpan(url, options);
            if (!createdSpan) {
              return original.apply(this, args);
            }
            var spanData = plugin._prepareSpanData(url);
            if (plugin.getConfig().measureRequestSize) {
              getFetchBodyLength.apply(void 0, __spreadArray9([], __read18(args), false)).then(function(length) {
                if (!length)
                  return;
                createdSpan.setAttribute(SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED, length);
              }).catch(function(error) {
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
                var resClone = response.clone();
                var resClone4Hook_1 = response.clone();
                var body = resClone.body;
                if (body) {
                  var reader_1 = body.getReader();
                  var read_1 = function() {
                    reader_1.read().then(function(_a3) {
                      var done = _a3.done;
                      if (done) {
                        endSpanOnSuccess(span, resClone4Hook_1);
                      } else {
                        read_1();
                      }
                    }, function(error) {
                      endSpanOnError(span, error);
                    });
                  };
                  read_1();
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
            return new Promise(function(resolve, reject) {
              return context.with(trace.setSpan(context.active(), createdSpan), function() {
                plugin._addHeaders(options, url);
                plugin._tasksCount++;
                return original.apply(self2, options instanceof Request ? [options] : [url, options]).then(onSuccess.bind(self2, createdSpan, resolve), onError.bind(self2, createdSpan, reject));
              });
            });
          };
        };
      };
      FetchInstrumentation2.prototype._applyAttributesAfterFetch = function(span, request, result) {
        var _this = this;
        var applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
        if (applyCustomAttributesOnSpan) {
          safeExecuteInTheMiddle(function() {
            return applyCustomAttributesOnSpan(span, request, result);
          }, function(error) {
            if (!error) {
              return;
            }
            _this._diag.error("applyCustomAttributesOnSpan", error);
          }, true);
        }
      };
      FetchInstrumentation2.prototype._prepareSpanData = function(spanUrl) {
        var startTime = hrTime();
        var entries = [];
        if (typeof PerformanceObserver !== "function") {
          return { entries, startTime, spanUrl };
        }
        var observer = new PerformanceObserver(function(list) {
          var perfObsEntries = list.getEntries();
          perfObsEntries.forEach(function(entry) {
            if (entry.initiatorType === "fetch" && entry.name === spanUrl) {
              entries.push(entry);
            }
          });
        });
        observer.observe({
          entryTypes: ["resource"]
        });
        return { entries, observer, startTime, spanUrl };
      };
      FetchInstrumentation2.prototype.enable = function() {
        if (isNode) {
          this._diag.warn("this instrumentation is intended for web usage only, it does not instrument Node.js's fetch()");
          return;
        }
        if (isWrapped(fetch)) {
          this._unwrap(_globalThis3, "fetch");
          this._diag.debug("removing previous patch for constructor");
        }
        this._wrap(_globalThis3, "fetch", this._patchConstructor());
      };
      FetchInstrumentation2.prototype.disable = function() {
        if (isNode) {
          return;
        }
        this._unwrap(_globalThis3, "fetch");
        this._usedResources = /* @__PURE__ */ new WeakSet();
      };
      return FetchInstrumentation2;
    }(InstrumentationBase)
  );

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/enums/AttributeNames.js
  var AttributeNames3;
  (function(AttributeNames5) {
    AttributeNames5["EVENT_TYPE"] = "event_type";
    AttributeNames5["TARGET_ELEMENT"] = "target_element";
    AttributeNames5["TARGET_XPATH"] = "target_xpath";
    AttributeNames5["HTTP_URL"] = "http.url";
  })(AttributeNames3 || (AttributeNames3 = {}));

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/version.js
  var PACKAGE_VERSION2 = "0.44.0";
  var PACKAGE_NAME2 = "@opentelemetry/instrumentation-user-interaction";

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/instrumentation.js
  var __extends9 = /* @__PURE__ */ function() {
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
  var ZONE_CONTEXT_KEY = "OT_ZONE_CONTEXT";
  var EVENT_NAVIGATION_NAME = "Navigation:";
  var DEFAULT_EVENT_NAMES2 = ["click"];
  function defaultShouldPreventSpanCreation() {
    return false;
  }
  var UserInteractionInstrumentation2 = (
    /** @class */
    function(_super) {
      __extends9(UserInteractionInstrumentation3, _super);
      function UserInteractionInstrumentation3(config) {
        if (config === void 0) {
          config = {};
        }
        var _a3;
        var _this = _super.call(this, PACKAGE_NAME2, PACKAGE_VERSION2, config) || this;
        _this.version = PACKAGE_VERSION2;
        _this.moduleName = "user-interaction";
        _this._spansData = /* @__PURE__ */ new WeakMap();
        _this._wrappedListeners = /* @__PURE__ */ new WeakMap();
        _this._eventsSpanMap = /* @__PURE__ */ new WeakMap();
        _this._eventNames = new Set((_a3 = config === null || config === void 0 ? void 0 : config.eventNames) !== null && _a3 !== void 0 ? _a3 : DEFAULT_EVENT_NAMES2);
        _this._shouldPreventSpanCreation = typeof (config === null || config === void 0 ? void 0 : config.shouldPreventSpanCreation) === "function" ? config.shouldPreventSpanCreation : defaultShouldPreventSpanCreation;
        return _this;
      }
      UserInteractionInstrumentation3.prototype.init = function() {
      };
      UserInteractionInstrumentation3.prototype._checkForTimeout = function(task, span) {
        var spanData = this._spansData.get(span);
        if (spanData) {
          if (task.source === "setTimeout") {
            spanData.hrTimeLastTimeout = hrTime();
          } else if (task.source !== "Promise.then" && task.source !== "setTimeout") {
            spanData.hrTimeLastTimeout = void 0;
          }
        }
      };
      UserInteractionInstrumentation3.prototype._allowEventName = function(eventName) {
        return this._eventNames.has(eventName);
      };
      UserInteractionInstrumentation3.prototype._createSpan = function(element, eventName, parentSpan) {
        var _a3;
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
        var xpath = getElementXPath(element, true);
        try {
          var span = this.tracer.startSpan(eventName, {
            attributes: (_a3 = {}, _a3[AttributeNames3.EVENT_TYPE] = eventName, _a3[AttributeNames3.TARGET_ELEMENT] = element.tagName, _a3[AttributeNames3.TARGET_XPATH] = xpath, _a3[AttributeNames3.HTTP_URL] = window.location.href, _a3)
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
      };
      UserInteractionInstrumentation3.prototype._decrementTask = function(span) {
        var spanData = this._spansData.get(span);
        if (spanData) {
          spanData.taskCount--;
          if (spanData.taskCount === 0) {
            this._tryToEndSpan(span, spanData.hrTimeLastTimeout);
          }
        }
      };
      UserInteractionInstrumentation3.prototype._getCurrentSpan = function(zone) {
        var context2 = zone.get(ZONE_CONTEXT_KEY);
        if (context2) {
          return trace.getSpan(context2);
        }
        return context2;
      };
      UserInteractionInstrumentation3.prototype._incrementTask = function(span) {
        var spanData = this._spansData.get(span);
        if (spanData) {
          spanData.taskCount++;
        }
      };
      UserInteractionInstrumentation3.prototype.addPatchedListener = function(on, type, listener, wrappedListener) {
        var listener2Type = this._wrappedListeners.get(listener);
        if (!listener2Type) {
          listener2Type = /* @__PURE__ */ new Map();
          this._wrappedListeners.set(listener, listener2Type);
        }
        var element2patched = listener2Type.get(type);
        if (!element2patched) {
          element2patched = /* @__PURE__ */ new Map();
          listener2Type.set(type, element2patched);
        }
        if (element2patched.has(on)) {
          return false;
        }
        element2patched.set(on, wrappedListener);
        return true;
      };
      UserInteractionInstrumentation3.prototype.removePatchedListener = function(on, type, listener) {
        var listener2Type = this._wrappedListeners.get(listener);
        if (!listener2Type) {
          return void 0;
        }
        var element2patched = listener2Type.get(type);
        if (!element2patched) {
          return void 0;
        }
        var patched = element2patched.get(on);
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
      };
      UserInteractionInstrumentation3.prototype._invokeListener = function(listener, target, args) {
        if (typeof listener === "function") {
          return listener.apply(target, args);
        } else {
          return listener.handleEvent(args[0]);
        }
      };
      UserInteractionInstrumentation3.prototype._patchAddEventListener = function() {
        var plugin = this;
        return function(original) {
          return function addEventListenerPatched(type, listener, useCapture) {
            if (!listener) {
              return original.call(this, type, listener, useCapture);
            }
            var once = useCapture && typeof useCapture === "object" && useCapture.once;
            var patchedListener = function() {
              var _this = this;
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
              }
              var parentSpan;
              var event = args[0];
              var target = event === null || event === void 0 ? void 0 : event.target;
              if (event) {
                parentSpan = plugin._eventsSpanMap.get(event);
              }
              if (once) {
                plugin.removePatchedListener(this, type, listener);
              }
              var span = plugin._createSpan(target, type, parentSpan);
              if (span) {
                if (event) {
                  plugin._eventsSpanMap.set(event, span);
                }
                return context.with(trace.setSpan(context.active(), span), function() {
                  var result = plugin._invokeListener(listener, _this, args);
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
      };
      UserInteractionInstrumentation3.prototype._patchRemoveEventListener = function() {
        var plugin = this;
        return function(original) {
          return function removeEventListenerPatched(type, listener, useCapture) {
            var wrappedListener = plugin.removePatchedListener(this, type, listener);
            if (wrappedListener) {
              return original.call(this, type, wrappedListener, useCapture);
            } else {
              return original.call(this, type, listener, useCapture);
            }
          };
        };
      };
      UserInteractionInstrumentation3.prototype._getPatchableEventTargets = function() {
        return window.EventTarget ? [EventTarget.prototype] : [Node.prototype, Window.prototype];
      };
      UserInteractionInstrumentation3.prototype._patchHistoryApi = function() {
        this._unpatchHistoryApi();
        this._wrap(history, "replaceState", this._patchHistoryMethod());
        this._wrap(history, "pushState", this._patchHistoryMethod());
        this._wrap(history, "back", this._patchHistoryMethod());
        this._wrap(history, "forward", this._patchHistoryMethod());
        this._wrap(history, "go", this._patchHistoryMethod());
      };
      UserInteractionInstrumentation3.prototype._patchHistoryMethod = function() {
        var plugin = this;
        return function(original) {
          return function patchHistoryMethod() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var url = "" + location.pathname + location.hash + location.search;
            var result = original.apply(this, args);
            var urlAfter = "" + location.pathname + location.hash + location.search;
            if (url !== urlAfter) {
              plugin._updateInteractionName(urlAfter);
            }
            return result;
          };
        };
      };
      UserInteractionInstrumentation3.prototype._unpatchHistoryApi = function() {
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
      };
      UserInteractionInstrumentation3.prototype._updateInteractionName = function(url) {
        var span = trace.getSpan(context.active());
        if (span && typeof span.updateName === "function") {
          span.updateName(EVENT_NAVIGATION_NAME + " " + url);
        }
      };
      UserInteractionInstrumentation3.prototype._patchZoneCancelTask = function() {
        var plugin = this;
        return function(original) {
          return function patchCancelTask(task) {
            var currentZone = Zone.current;
            var currentSpan = plugin._getCurrentSpan(currentZone);
            if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
              plugin._decrementTask(currentSpan);
            }
            return original.call(this, task);
          };
        };
      };
      UserInteractionInstrumentation3.prototype._patchZoneScheduleTask = function() {
        var plugin = this;
        return function(original) {
          return function patchScheduleTask(task) {
            var currentZone = Zone.current;
            var currentSpan = plugin._getCurrentSpan(currentZone);
            if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
              plugin._incrementTask(currentSpan);
              plugin._checkForTimeout(task, currentSpan);
            }
            return original.call(this, task);
          };
        };
      };
      UserInteractionInstrumentation3.prototype._patchZoneRunTask = function() {
        var plugin = this;
        return function(original) {
          return function patchRunTask(task, applyThis, applyArgs) {
            var event = Array.isArray(applyArgs) && applyArgs[0] instanceof Event ? applyArgs[0] : void 0;
            var target = event === null || event === void 0 ? void 0 : event.target;
            var span;
            var activeZone = this;
            if (target) {
              span = plugin._createSpan(target, task.eventName);
              if (span) {
                plugin._incrementTask(span);
                return activeZone.run(function() {
                  try {
                    return context.with(trace.setSpan(context.active(), span), function() {
                      var currentZone = Zone.current;
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
      };
      UserInteractionInstrumentation3.prototype._shouldCountTask = function(task, currentZone) {
        if (task._zone) {
          currentZone = task._zone;
        }
        if (!currentZone || !task.data || task.data.isPeriodic) {
          return false;
        }
        var currentSpan = this._getCurrentSpan(currentZone);
        if (!currentSpan) {
          return false;
        }
        if (!this._spansData.get(currentSpan)) {
          return false;
        }
        return task.type === "macroTask" || task.type === "microTask";
      };
      UserInteractionInstrumentation3.prototype._tryToEndSpan = function(span, endTime) {
        if (span) {
          var spanData = this._spansData.get(span);
          if (spanData) {
            span.end(endTime);
            this._spansData.delete(span);
          }
        }
      };
      UserInteractionInstrumentation3.prototype.enable = function() {
        var _this = this;
        var ZoneWithPrototype = this._getZoneWithPrototype();
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
          var targets = this._getPatchableEventTargets();
          targets.forEach(function(target) {
            if (isWrapped(target.addEventListener)) {
              _this._unwrap(target, "addEventListener");
              _this._diag.debug("removing previous patch from method addEventListener");
            }
            if (isWrapped(target.removeEventListener)) {
              _this._unwrap(target, "removeEventListener");
              _this._diag.debug("removing previous patch from method removeEventListener");
            }
            _this._wrap(target, "addEventListener", _this._patchAddEventListener());
            _this._wrap(target, "removeEventListener", _this._patchRemoveEventListener());
          });
        }
        this._patchHistoryApi();
      };
      UserInteractionInstrumentation3.prototype.disable = function() {
        var _this = this;
        var ZoneWithPrototype = this._getZoneWithPrototype();
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
          var targets = this._getPatchableEventTargets();
          targets.forEach(function(target) {
            if (isWrapped(target.addEventListener)) {
              _this._unwrap(target, "addEventListener");
            }
            if (isWrapped(target.removeEventListener)) {
              _this._unwrap(target, "removeEventListener");
            }
          });
        }
        this._unpatchHistoryApi();
      };
      UserInteractionInstrumentation3.prototype._getZoneWithPrototype = function() {
        var _window = window;
        return _window.Zone;
      };
      return UserInteractionInstrumentation3;
    }(InstrumentationBase)
  );

  // node_modules/@opentelemetry/instrumentation-xml-http-request/node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_HTTP_METHOD2 = "http.method";
  var TMP_HTTP_URL3 = "http.url";
  var TMP_HTTP_HOST2 = "http.host";
  var TMP_HTTP_SCHEME2 = "http.scheme";
  var TMP_HTTP_STATUS_CODE2 = "http.status_code";
  var TMP_HTTP_USER_AGENT3 = "http.user_agent";
  var TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2 = "http.request_content_length_uncompressed";
  var SEMATTRS_HTTP_METHOD2 = TMP_HTTP_METHOD2;
  var SEMATTRS_HTTP_URL3 = TMP_HTTP_URL3;
  var SEMATTRS_HTTP_HOST2 = TMP_HTTP_HOST2;
  var SEMATTRS_HTTP_SCHEME2 = TMP_HTTP_SCHEME2;
  var SEMATTRS_HTTP_STATUS_CODE2 = TMP_HTTP_STATUS_CODE2;
  var SEMATTRS_HTTP_USER_AGENT3 = TMP_HTTP_USER_AGENT3;
  var SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2 = TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2;

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
  var __values9 = function(o2) {
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
  var __read19 = function(o2, n2) {
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
  var DIAG_LOGGER2 = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-xml-http-request/utils"
  });
  function getXHRBodyLength2(body) {
    if (typeof Document !== "undefined" && body instanceof Document) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    if (body instanceof FormData) {
      return getFormDataSize2(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength2(body.toString());
    }
    if (typeof body === "string") {
      return getByteLength2(body);
    }
    DIAG_LOGGER2.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER2 = new TextEncoder();
  function getByteLength2(s2) {
    return TEXT_ENCODER2.encode(s2).byteLength;
  }
  function getFormDataSize2(formData) {
    var e_1, _a3;
    var size = 0;
    try {
      for (var _b = __values9(formData.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read19(_c.value, 2), key = _d[0], value = _d[1];
        size += key.length;
        if (value instanceof Blob) {
          size += value.size;
        } else {
          size += value.length;
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a3 = _b.return)) _a3.call(_b);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return size;
  }

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/version.js
  var VERSION6 = "0.57.2";

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/enums/AttributeNames.js
  var AttributeNames4;
  (function(AttributeNames5) {
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames4 || (AttributeNames4 = {}));

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/xhr.js
  var __extends10 = /* @__PURE__ */ function() {
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
  var OBSERVER_WAIT_TIME_MS2 = 300;
  var XMLHttpRequestInstrumentation = (
    /** @class */
    function(_super) {
      __extends10(XMLHttpRequestInstrumentation2, _super);
      function XMLHttpRequestInstrumentation2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, "@opentelemetry/instrumentation-xml-http-request", VERSION6, config) || this;
        _this.component = "xml-http-request";
        _this.version = VERSION6;
        _this.moduleName = _this.component;
        _this._tasksCount = 0;
        _this._xhrMem = /* @__PURE__ */ new WeakMap();
        _this._usedResources = /* @__PURE__ */ new WeakSet();
        return _this;
      }
      XMLHttpRequestInstrumentation2.prototype.init = function() {
      };
      XMLHttpRequestInstrumentation2.prototype._addHeaders = function(xhr, spanUrl) {
        var url = parseUrl(spanUrl).href;
        if (!shouldPropagateTraceHeaders(url, this.getConfig().propagateTraceHeaderCorsUrls)) {
          var headers_1 = {};
          propagation.inject(context.active(), headers_1);
          if (Object.keys(headers_1).length > 0) {
            this._diag.debug("headers inject skipped due to CORS policy");
          }
          return;
        }
        var headers = {};
        propagation.inject(context.active(), headers);
        Object.keys(headers).forEach(function(key) {
          xhr.setRequestHeader(key, String(headers[key]));
        });
      };
      XMLHttpRequestInstrumentation2.prototype._addChildSpan = function(span, corsPreFlightRequest) {
        var _this = this;
        context.with(trace.setSpan(context.active(), span), function() {
          var childSpan = _this.tracer.startSpan("CORS Preflight", {
            startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
          });
          addSpanNetworkEvents(childSpan, corsPreFlightRequest, _this.getConfig().ignoreNetworkEvents);
          childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
        });
      };
      XMLHttpRequestInstrumentation2.prototype._addFinalSpanAttributes = function(span, xhrMem, spanUrl) {
        if (typeof spanUrl === "string") {
          var parsedUrl = parseUrl(spanUrl);
          if (xhrMem.status !== void 0) {
            span.setAttribute(SEMATTRS_HTTP_STATUS_CODE2, xhrMem.status);
          }
          if (xhrMem.statusText !== void 0) {
            span.setAttribute(AttributeNames4.HTTP_STATUS_TEXT, xhrMem.statusText);
          }
          span.setAttribute(SEMATTRS_HTTP_HOST2, parsedUrl.host);
          span.setAttribute(SEMATTRS_HTTP_SCHEME2, parsedUrl.protocol.replace(":", ""));
          span.setAttribute(SEMATTRS_HTTP_USER_AGENT3, navigator.userAgent);
        }
      };
      XMLHttpRequestInstrumentation2.prototype._applyAttributesAfterXHR = function(span, xhr) {
        var _this = this;
        var applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
        if (typeof applyCustomAttributesOnSpan === "function") {
          safeExecuteInTheMiddle(function() {
            return applyCustomAttributesOnSpan(span, xhr);
          }, function(error) {
            if (!error) {
              return;
            }
            _this._diag.error("applyCustomAttributesOnSpan", error);
          }, true);
        }
      };
      XMLHttpRequestInstrumentation2.prototype._addResourceObserver = function(xhr, spanUrl) {
        var xhrMem = this._xhrMem.get(xhr);
        if (!xhrMem || typeof PerformanceObserver !== "function" || typeof PerformanceResourceTiming !== "function") {
          return;
        }
        xhrMem.createdResources = {
          observer: new PerformanceObserver(function(list) {
            var entries = list.getEntries();
            var parsedUrl = parseUrl(spanUrl);
            entries.forEach(function(entry) {
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
      };
      XMLHttpRequestInstrumentation2.prototype._clearResources = function() {
        if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
          otperformance.clearResourceTimings();
          this._xhrMem = /* @__PURE__ */ new WeakMap();
          this._usedResources = /* @__PURE__ */ new WeakSet();
        }
      };
      XMLHttpRequestInstrumentation2.prototype._findResourceAndAddNetworkEvents = function(xhrMem, span, spanUrl, startTime, endTime) {
        if (!spanUrl || !startTime || !endTime || !xhrMem.createdResources) {
          return;
        }
        var resources = xhrMem.createdResources.entries;
        if (!resources || !resources.length) {
          resources = otperformance.getEntriesByType("resource");
        }
        var resource = getResource(parseUrl(spanUrl).href, startTime, endTime, resources, this._usedResources);
        if (resource.mainRequest) {
          var mainRequest = resource.mainRequest;
          this._markResourceAsUsed(mainRequest);
          var corsPreFlightRequest = resource.corsPreFlightRequest;
          if (corsPreFlightRequest) {
            this._addChildSpan(span, corsPreFlightRequest);
            this._markResourceAsUsed(corsPreFlightRequest);
          }
          addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents);
        }
      };
      XMLHttpRequestInstrumentation2.prototype._cleanPreviousSpanInformation = function(xhr) {
        var xhrMem = this._xhrMem.get(xhr);
        if (xhrMem) {
          var callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
          if (callbackToRemoveEvents) {
            callbackToRemoveEvents();
          }
          this._xhrMem.delete(xhr);
        }
      };
      XMLHttpRequestInstrumentation2.prototype._createSpan = function(xhr, url, method) {
        var _a3;
        if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
          this._diag.debug("ignoring span as url matches ignored url");
          return;
        }
        var spanName = method.toUpperCase();
        var currentSpan = this.tracer.startSpan(spanName, {
          kind: SpanKind.CLIENT,
          attributes: (_a3 = {}, _a3[SEMATTRS_HTTP_METHOD2] = method, _a3[SEMATTRS_HTTP_URL3] = parseUrl(url).toString(), _a3)
        });
        currentSpan.addEvent(EventNames2.METHOD_OPEN);
        this._cleanPreviousSpanInformation(xhr);
        this._xhrMem.set(xhr, {
          span: currentSpan,
          spanUrl: url
        });
        return currentSpan;
      };
      XMLHttpRequestInstrumentation2.prototype._markResourceAsUsed = function(resource) {
        this._usedResources.add(resource);
      };
      XMLHttpRequestInstrumentation2.prototype._patchOpen = function() {
        var _this = this;
        return function(original) {
          var plugin = _this;
          return function patchOpen() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var method = args[0];
            var url = args[1];
            plugin._createSpan(this, url, method);
            return original.apply(this, args);
          };
        };
      };
      XMLHttpRequestInstrumentation2.prototype._patchSend = function() {
        var plugin = this;
        function endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime) {
          var callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
          if (typeof callbackToRemoveEvents === "function") {
            callbackToRemoveEvents();
          }
          var span = xhrMem.span, spanUrl = xhrMem.spanUrl, sendStartTime = xhrMem.sendStartTime;
          if (span) {
            plugin._findResourceAndAddNetworkEvents(xhrMem, span, spanUrl, sendStartTime, performanceEndTime);
            span.addEvent(eventName, endTime);
            plugin._addFinalSpanAttributes(span, xhrMem, spanUrl);
            span.end(endTime);
            plugin._tasksCount--;
          }
          plugin._clearResources();
        }
        function endSpan(eventName, xhr) {
          var xhrMem = plugin._xhrMem.get(xhr);
          if (!xhrMem) {
            return;
          }
          xhrMem.status = xhr.status;
          xhrMem.statusText = xhr.statusText;
          plugin._xhrMem.delete(xhr);
          if (xhrMem.span) {
            plugin._applyAttributesAfterXHR(xhrMem.span, xhr);
          }
          var performanceEndTime = hrTime();
          var endTime = Date.now();
          setTimeout(function() {
            endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime);
          }, OBSERVER_WAIT_TIME_MS2);
        }
        function onError() {
          endSpan(EventNames2.EVENT_ERROR, this);
        }
        function onAbort() {
          endSpan(EventNames2.EVENT_ABORT, this);
        }
        function onTimeout() {
          endSpan(EventNames2.EVENT_TIMEOUT, this);
        }
        function onLoad() {
          if (this.status < 299) {
            endSpan(EventNames2.EVENT_LOAD, this);
          } else {
            endSpan(EventNames2.EVENT_ERROR, this);
          }
        }
        function unregister(xhr) {
          xhr.removeEventListener("abort", onAbort);
          xhr.removeEventListener("error", onError);
          xhr.removeEventListener("load", onLoad);
          xhr.removeEventListener("timeout", onTimeout);
          var xhrMem = plugin._xhrMem.get(xhr);
          if (xhrMem) {
            xhrMem.callbackToRemoveEvents = void 0;
          }
        }
        return function(original) {
          return function patchSend() {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var xhrMem = plugin._xhrMem.get(this);
            if (!xhrMem) {
              return original.apply(this, args);
            }
            var currentSpan = xhrMem.span;
            var spanUrl = xhrMem.spanUrl;
            if (currentSpan && spanUrl) {
              if (plugin.getConfig().measureRequestSize && (args === null || args === void 0 ? void 0 : args[0])) {
                var body = args[0];
                var bodyLength = getXHRBodyLength2(body);
                if (bodyLength !== void 0) {
                  currentSpan.setAttribute(SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2, bodyLength);
                }
              }
              context.with(trace.setSpan(context.active(), currentSpan), function() {
                plugin._tasksCount++;
                xhrMem.sendStartTime = hrTime();
                currentSpan.addEvent(EventNames2.METHOD_SEND);
                _this.addEventListener("abort", onAbort);
                _this.addEventListener("error", onError);
                _this.addEventListener("load", onLoad);
                _this.addEventListener("timeout", onTimeout);
                xhrMem.callbackToRemoveEvents = function() {
                  unregister(_this);
                  if (xhrMem.createdResources) {
                    xhrMem.createdResources.observer.disconnect();
                  }
                };
                plugin._addHeaders(_this, spanUrl);
                plugin._addResourceObserver(_this, spanUrl);
              });
            }
            return original.apply(this, args);
          };
        };
      };
      XMLHttpRequestInstrumentation2.prototype.enable = function() {
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
      };
      XMLHttpRequestInstrumentation2.prototype.disable = function() {
        this._diag.debug("removing patch from", this.moduleName, this.version);
        this._unwrap(XMLHttpRequest.prototype, "open");
        this._unwrap(XMLHttpRequest.prototype, "send");
        this._tasksCount = 0;
        this._xhrMem = /* @__PURE__ */ new WeakMap();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      };
      return XMLHttpRequestInstrumentation2;
    }(InstrumentationBase)
  );

  // node_modules/@opentelemetry/auto-instrumentations-web/build/esm/utils.js
  var InstrumentationMap = {
    "@opentelemetry/instrumentation-document-load": DocumentLoadInstrumentation,
    "@opentelemetry/instrumentation-fetch": FetchInstrumentation,
    "@opentelemetry/instrumentation-user-interaction": UserInteractionInstrumentation2,
    "@opentelemetry/instrumentation-xml-http-request": XMLHttpRequestInstrumentation
  };
  function getWebAutoInstrumentations(inputConfigs) {
    var _a3;
    if (inputConfigs === void 0) {
      inputConfigs = {};
    }
    for (var _i = 0, _b = Object.keys(inputConfigs); _i < _b.length; _i++) {
      var name_1 = _b[_i];
      if (!Object.prototype.hasOwnProperty.call(InstrumentationMap, name_1)) {
        diag2.error('Provided instrumentation name "' + name_1 + '" not found');
        continue;
      }
    }
    var instrumentations = [];
    for (var _c = 0, _d = Object.keys(InstrumentationMap); _c < _d.length; _c++) {
      var name_2 = _d[_c];
      var Instance = InstrumentationMap[name_2];
      var userConfig = (_a3 = inputConfigs[name_2]) !== null && _a3 !== void 0 ? _a3 : {};
      if (userConfig.enabled === false) {
        diag2.debug("Disabling instrumentation for " + name_2);
        continue;
      }
      try {
        diag2.debug("Loading instrumentation for " + name_2);
        instrumentations.push(new Instance(userConfig));
      } catch (e2) {
        diag2.error(e2);
      }
    }
    return instrumentations;
  }

  // src/hny.js
  var MY_VERSION = "0.10.36";
  function initializeTracing(params) {
    if (!params) {
      params = {};
    }
    if (!params.apiKey) {
      throw new Error(
        "Usage: initializeTracing({ apiKey: 'honeycomb api key', serviceName: 'name of this service' })"
      );
    }
    if (!params.serviceName) {
      console.log(
        "No service name provided to initializeTracing. Defaulting to unknown_service"
      );
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
      ignoreNetworkEvents: true
      // propagateTraceHeaderCorsUrls: [
      // /.+/g, // Regex to match your backend URLs. Update to the domains you wish to include.
      // ]
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
    console.log(
      `Hny-otel-web tracing initialized, ${MY_VERSION} at last update of this message`
    );
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
    return getTracer(inputTracer).startActiveSpan(
      spanName,
      {},
      context2 || null,
      (span) => {
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
      }
    );
  }
  async function inSpanAsync(inputTracer, spanName, fn, context2) {
    if (fn === void 0) {
      console.log(
        "USAGE: inSpanAsync(tracerName, spanName, async () => { ... })"
      );
    }
    return getTracer(inputTracer).startActiveSpan(
      spanName,
      {},
      context2,
      async (span) => {
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
      }
    );
  }
  function recordException2(exception, additionalAttributes) {
    const span = trace.getActiveSpan();
    if (!span) {
      return;
    }
    const attributes = {};
    if (typeof exception === "string") {
      attributes[ATTR_EXCEPTION_MESSAGE2] = exception;
    } else if (exception) {
      if (exception.code) {
        attributes[ATTR_EXCEPTION_TYPE2] = exception.code.toString();
      } else if (exception.name) {
        attributes[ATTR_EXCEPTION_TYPE2] = exception.name;
      }
      if (exception.message) {
        attributes[ATTR_EXCEPTION_MESSAGE2] = exception.message;
      }
      if (exception.stack) {
        attributes[ATTR_EXCEPTION_STACKTRACE2] = exception.stack;
      }
    }
    const allAttributes = { ...attributes, ...additionalAttributes };
    span.addEvent("exception", allAttributes);
    span.setStatus({
      code: 2,
      // SpanStatusCode.ERROR,
      message: attributes[ATTR_EXCEPTION_MESSAGE2]
    });
  }
  function addSpanEvent(message, attributes) {
    const span = trace.getActiveSpan();
    span?.addEvent(message, attributes);
  }
  function inChildSpan(inputTracer, spanName, spanContext, fn) {
    if (!!spanContext && (!spanContext.spanId || !spanContext.traceId || spanContext.traceFlags === void 0)) {
      console.log(
        "inChildSpan: the third argument should be a spanContext (or undefined to use the active context)"
      );
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
