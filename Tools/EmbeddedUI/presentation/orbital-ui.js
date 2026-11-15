function sy(b) {
  return b && b.__esModule && Object.prototype.hasOwnProperty.call(b, "default") ? b.default : b;
}
var bs = { exports: {} }, en = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var k0;
function oy() {
  if (k0) return en;
  k0 = 1;
  var b = Symbol.for("react.transitional.element"), N = Symbol.for("react.fragment");
  function D(h, J, I) {
    var vl = null;
    if (I !== void 0 && (vl = "" + I), J.key !== void 0 && (vl = "" + J.key), "key" in J) {
      I = {};
      for (var Z in J)
        Z !== "key" && (I[Z] = J[Z]);
    } else I = J;
    return J = I.ref, {
      $$typeof: b,
      type: h,
      key: vl,
      ref: J !== void 0 ? J : null,
      props: I
    };
  }
  return en.Fragment = N, en.jsx = D, en.jsxs = D, en;
}
var I0;
function dy() {
  return I0 || (I0 = 1, bs.exports = oy()), bs.exports;
}
var o = dy(), Ts = { exports: {} }, Q = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var P0;
function ry() {
  if (P0) return Q;
  P0 = 1;
  var b = Symbol.for("react.transitional.element"), N = Symbol.for("react.portal"), D = Symbol.for("react.fragment"), h = Symbol.for("react.strict_mode"), J = Symbol.for("react.profiler"), I = Symbol.for("react.consumer"), vl = Symbol.for("react.context"), Z = Symbol.for("react.forward_ref"), fl = Symbol.for("react.suspense"), _l = Symbol.for("react.memo"), M = Symbol.for("react.lazy"), T = Symbol.for("react.activity"), H = Symbol.for("react.view_transition"), B = Symbol.iterator;
  function gl(d) {
    return d === null || typeof d != "object" ? null : (d = B && d[B] || d["@@iterator"], typeof d == "function" ? d : null);
  }
  var Kl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, rl = Object.assign, Jl = {};
  function ut(d, z, p) {
    this.props = d, this.context = z, this.refs = Jl, this.updater = p || Kl;
  }
  ut.prototype.isReactComponent = {}, ut.prototype.setState = function(d, z) {
    if (typeof d != "object" && typeof d != "function" && d != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, d, z, "setState");
  }, ut.prototype.forceUpdate = function(d) {
    this.updater.enqueueForceUpdate(this, d, "forceUpdate");
  };
  function Ja() {
  }
  Ja.prototype = ut.prototype;
  function Bt(d, z, p) {
    this.props = d, this.context = z, this.refs = Jl, this.updater = p || Kl;
  }
  var qt = Bt.prototype = new Ja();
  qt.constructor = Bt, rl(qt, ut.prototype), qt.isPureReactComponent = !0;
  var nt = Array.isArray;
  function w() {
  }
  var el = { H: null, A: null, T: null, S: null }, Yt = Object.prototype.hasOwnProperty;
  function St(d, z, p) {
    var R = p.ref;
    return {
      $$typeof: b,
      type: d,
      key: z,
      ref: R !== void 0 ? R : null,
      props: p
    };
  }
  function bt(d, z) {
    return St(d.type, z, d.props);
  }
  function it(d) {
    return typeof d == "object" && d !== null && d.$$typeof === b;
  }
  function ya(d) {
    var z = { "=": "=0", ":": "=2" };
    return "$" + d.replace(/[=:]/g, function(p) {
      return z[p];
    });
  }
  var wa = /\/+/g;
  function Ul(d, z) {
    return typeof d == "object" && d !== null && d.key != null ? ya("" + d.key) : z.toString(36);
  }
  function A(d) {
    switch (d.status) {
      case "fulfilled":
        return d.value;
      case "rejected":
        throw d.reason;
      default:
        switch (typeof d.status == "string" ? d.then(w, w) : (d.status = "pending", d.then(
          function(z) {
            d.status === "pending" && (d.status = "fulfilled", d.value = z);
          },
          function(z) {
            d.status === "pending" && (d.status = "rejected", d.reason = z);
          }
        )), d.status) {
          case "fulfilled":
            return d.value;
          case "rejected":
            throw d.reason;
        }
    }
    throw d;
  }
  function Y(d, z, p, R, ll) {
    var tl = typeof d;
    (tl === "undefined" || tl === "boolean") && (d = null);
    var ul = !1;
    if (d === null) ul = !0;
    else
      switch (tl) {
        case "bigint":
        case "string":
        case "number":
          ul = !0;
          break;
        case "object":
          switch (d.$$typeof) {
            case b:
            case N:
              ul = !0;
              break;
            case M:
              return ul = d._init, Y(
                ul(d._payload),
                z,
                p,
                R,
                ll
              );
          }
      }
    if (ul)
      return ll = ll(d), ul = R === "" ? "." + Ul(d, 0) : R, nt(ll) ? (p = "", ul != null && (p = ul.replace(wa, "$&/") + "/"), Y(ll, z, p, "", function(la) {
        return la;
      })) : ll != null && (it(ll) && (ll = bt(
        ll,
        p + (ll.key == null || d && d.key === ll.key ? "" : ("" + ll.key).replace(
          wa,
          "$&/"
        ) + "/") + ul
      )), z.push(ll)), 1;
    ul = 0;
    var j = R === "" ? "." : R + ":";
    if (nt(d))
      for (var X = 0; X < d.length; X++)
        R = d[X], tl = j + Ul(R, X), ul += Y(
          R,
          z,
          p,
          tl,
          ll
        );
    else if (X = gl(d), typeof X == "function")
      for (d = X.call(d), X = 0; !(R = d.next()).done; )
        R = R.value, tl = j + Ul(R, X++), ul += Y(
          R,
          z,
          p,
          tl,
          ll
        );
    else if (tl === "object") {
      if (typeof d.then == "function")
        return Y(
          A(d),
          z,
          p,
          R,
          ll
        );
      throw z = String(d), Error(
        "Objects are not valid as a React child (found: " + (z === "[object Object]" ? "object with keys {" + Object.keys(d).join(", ") + "}" : z) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ul;
  }
  function G(d, z, p) {
    if (d == null) return d;
    var R = [], ll = 0;
    return Y(d, R, "", "", function(tl) {
      return z.call(p, tl, ll++);
    }), R;
  }
  function hl(d) {
    if (d._status === -1) {
      var z = d._result, p = z();
      p.then(
        function(R) {
          (d._status === 0 || d._status === -1) && (d._status = 1, d._result = R, p.status === void 0 && (p.status = "fulfilled", p.value = R));
        },
        function(R) {
          (d._status === 0 || d._status === -1) && (d._status = 2, d._result = R, p.status === void 0 && (p.status = "rejected", p.reason = R));
        }
      ), d._status === -1 && (d._status = 0, d._result = p);
    }
    if (d._status === 1) return d._result.default;
    throw d._result;
  }
  var il = typeof reportError == "function" ? reportError : function(d) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var z = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof d == "object" && d !== null && typeof d.message == "string" ? String(d.message) : String(d),
        error: d
      });
      if (!window.dispatchEvent(z)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", d);
      return;
    }
    console.error(d);
  };
  function xt(d) {
    var z = el.T, p = {};
    p.types = z !== null ? z.types : null, el.T = p;
    try {
      var R = d(), ll = el.S;
      ll !== null && ll(p, R), typeof R == "object" && R !== null && typeof R.then == "function" && R.then(w, il);
    } catch (tl) {
      il(tl);
    } finally {
      z !== null && p.types !== null && (z.types = p.types), el.T = z;
    }
  }
  function Pt(d) {
    var z = el.T;
    if (z !== null) {
      var p = z.types;
      p === null ? z.types = [d] : p.indexOf(d) === -1 && p.push(d);
    } else xt(Pt.bind(null, d));
  }
  var Fa = {
    map: G,
    forEach: function(d, z, p) {
      G(
        d,
        function() {
          z.apply(this, arguments);
        },
        p
      );
    },
    count: function(d) {
      var z = 0;
      return G(d, function() {
        z++;
      }), z;
    },
    toArray: function(d) {
      return G(d, function(z) {
        return z;
      }) || [];
    },
    only: function(d) {
      if (!it(d))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return d;
    }
  };
  return Q.Activity = T, Q.Children = Fa, Q.Component = ut, Q.Fragment = D, Q.Profiler = J, Q.PureComponent = Bt, Q.StrictMode = h, Q.Suspense = fl, Q.ViewTransition = H, Q.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = el, Q.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(d) {
      return el.H.useMemoCache(d);
    }
  }, Q.addTransitionType = Pt, Q.cache = function(d) {
    return function() {
      return d.apply(null, arguments);
    };
  }, Q.cacheSignal = function() {
    return null;
  }, Q.cloneElement = function(d, z, p) {
    if (d == null)
      throw Error(
        "The argument must be a React element, but you passed " + d + "."
      );
    var R = rl({}, d.props), ll = d.key;
    if (z != null)
      for (tl in z.key !== void 0 && (ll = "" + z.key), z)
        !Yt.call(z, tl) || tl === "key" || tl === "__self" || tl === "__source" || tl === "ref" && z.ref === void 0 || (R[tl] = z[tl]);
    var tl = arguments.length - 2;
    if (tl === 1) R.children = p;
    else if (1 < tl) {
      for (var ul = Array(tl), j = 0; j < tl; j++)
        ul[j] = arguments[j + 2];
      R.children = ul;
    }
    return St(d.type, ll, R);
  }, Q.createContext = function(d) {
    return d = {
      $$typeof: vl,
      _currentValue: d,
      _currentValue2: d,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, d.Provider = d, d.Consumer = {
      $$typeof: I,
      _context: d
    }, d;
  }, Q.createElement = function(d, z, p) {
    var R, ll = {}, tl = null;
    if (z != null)
      for (R in z.key !== void 0 && (tl = "" + z.key), z)
        Yt.call(z, R) && R !== "key" && R !== "__self" && R !== "__source" && (ll[R] = z[R]);
    var ul = arguments.length - 2;
    if (ul === 1) ll.children = p;
    else if (1 < ul) {
      for (var j = Array(ul), X = 0; X < ul; X++)
        j[X] = arguments[X + 2];
      ll.children = j;
    }
    if (d && d.defaultProps)
      for (R in ul = d.defaultProps, ul)
        ll[R] === void 0 && (ll[R] = ul[R]);
    return St(d, tl, ll);
  }, Q.createRef = function() {
    return { current: null };
  }, Q.forwardRef = function(d) {
    return { $$typeof: Z, render: d };
  }, Q.isValidElement = it, Q.lazy = function(d) {
    return {
      $$typeof: M,
      _payload: { _status: -1, _result: d },
      _init: hl
    };
  }, Q.memo = function(d, z) {
    return {
      $$typeof: _l,
      type: d,
      compare: z === void 0 ? null : z
    };
  }, Q.startTransition = xt, Q.unstable_useCacheRefresh = function() {
    return el.H.useCacheRefresh();
  }, Q.use = function(d) {
    return el.H.use(d);
  }, Q.useActionState = function(d, z, p) {
    return el.H.useActionState(d, z, p);
  }, Q.useCallback = function(d, z) {
    return el.H.useCallback(d, z);
  }, Q.useContext = function(d) {
    return el.H.useContext(d);
  }, Q.useDebugValue = function() {
  }, Q.useDeferredValue = function(d, z) {
    return el.H.useDeferredValue(d, z);
  }, Q.useEffect = function(d, z) {
    return el.H.useEffect(d, z);
  }, Q.useEffectEvent = function(d) {
    return el.H.useEffectEvent(d);
  }, Q.useId = function() {
    return el.H.useId();
  }, Q.useImperativeHandle = function(d, z, p) {
    return el.H.useImperativeHandle(d, z, p);
  }, Q.useInsertionEffect = function(d, z) {
    return el.H.useInsertionEffect(d, z);
  }, Q.useLayoutEffect = function(d, z) {
    return el.H.useLayoutEffect(d, z);
  }, Q.useMemo = function(d, z) {
    return el.H.useMemo(d, z);
  }, Q.useOptimistic = function(d, z) {
    return el.H.useOptimistic(d, z);
  }, Q.useReducer = function(d, z, p) {
    return el.H.useReducer(d, z, p);
  }, Q.useRef = function(d) {
    return el.H.useRef(d);
  }, Q.useState = function(d) {
    return el.H.useState(d);
  }, Q.useSyncExternalStore = function(d, z, p) {
    return el.H.useSyncExternalStore(
      d,
      z,
      p
    );
  }, Q.useTransition = function() {
    return el.H.useTransition();
  }, Q.version = "19.3.1", Q;
}
var lm;
function Os() {
  return lm || (lm = 1, Ts.exports = ry()), Ts.exports;
}
var It = Os();
const my = /* @__PURE__ */ sy(It);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vy = (b) => b.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), hy = (b) => b.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (N, D, h) => h ? h.toUpperCase() : D.toLowerCase()
), tm = (b) => {
  const N = hy(b);
  return N.charAt(0).toUpperCase() + N.slice(1);
}, fm = (...b) => b.filter((N, D, h) => !!N && N.trim() !== "" && h.indexOf(N) === D).join(" ").trim(), yy = (b) => {
  for (const N in b)
    if (N.startsWith("aria-") || N === "role" || N === "title")
      return !0;
};
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var gy = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sy = It.forwardRef(
  ({
    color: b = "currentColor",
    size: N = 24,
    strokeWidth: D = 2,
    absoluteStrokeWidth: h,
    className: J = "",
    children: I,
    iconNode: vl,
    ...Z
  }, fl) => It.createElement(
    "svg",
    {
      ref: fl,
      ...gy,
      width: N,
      height: N,
      stroke: b,
      strokeWidth: h ? Number(D) * 24 / Number(N) : D,
      className: fm("lucide", J),
      ...!I && !yy(Z) && { "aria-hidden": "true" },
      ...Z
    },
    [
      ...vl.map(([_l, M]) => It.createElement(_l, M)),
      ...Array.isArray(I) ? I : [I]
    ]
  )
);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nn = (b, N) => {
  const D = It.forwardRef(
    ({ className: h, ...J }, I) => It.createElement(Sy, {
      ref: I,
      iconNode: N,
      className: fm(
        `lucide-${vy(tm(b))}`,
        `lucide-${b}`,
        h
      ),
      ...J
    })
  );
  return D.displayName = tm(b), D;
};
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const by = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], Ty = nn("arrow-right", by);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _y = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], sm = nn("chevron-right", _y);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ey = [
  ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]
], zy = nn("gauge", Ey);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ny = [
  ["path", { d: "M16.247 7.761a6 6 0 0 1 0 8.478", key: "1fwjs5" }],
  ["path", { d: "M19.075 4.933a10 10 0 0 1 0 14.134", key: "ehdyv1" }],
  ["path", { d: "M4.925 19.067a10 10 0 0 1 0-14.134", key: "1q22gi" }],
  ["path", { d: "M7.753 16.239a6 6 0 0 1 0-8.478", key: "r2q7qm" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], Oy = nn("radio", Ny);
/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ay = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2", key: "aa7l1z" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2", key: "4qcy5o" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2", key: "6vwrx8" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2", key: "ioqczr" }],
  ["path", { d: "M7 12h10", key: "b7w52i" }]
], Dy = nn("scan-line", Ay);
function om({ items: b = [] }) {
  return /* @__PURE__ */ o.jsx("dl", { className: "campaign-metrics", children: b.map(
    (N) => /* @__PURE__ */ o.jsxs("div", { children: [
      /* @__PURE__ */ o.jsx("dt", { children: N.label }),
      /* @__PURE__ */ o.jsx("dd", { children: N.value })
    ] }, N.label)
  ) });
}
function My({ rows: b = [] }) {
  return b.length ? /* @__PURE__ */ o.jsx("div", { className: "campaign-table", children: /* @__PURE__ */ o.jsxs("table", { children: [
    /* @__PURE__ */ o.jsx("caption", { children: "Results timeline" }),
    /* @__PURE__ */ o.jsx("thead", { children: /* @__PURE__ */ o.jsxs("tr", { children: [
      /* @__PURE__ */ o.jsx("th", { scope: "col", children: "Target" }),
      /* @__PURE__ */ o.jsx("th", { scope: "col", children: "Planned" }),
      /* @__PURE__ */ o.jsx("th", { scope: "col", children: "Recorded or served" }),
      /* @__PURE__ */ o.jsx("th", { scope: "col", children: "Confirmed on Earth" })
    ] }) }),
    /* @__PURE__ */ o.jsx("tbody", { children: b.map((N) => /* @__PURE__ */ o.jsxs("tr", { "data-result": N.status, children: [
      /* @__PURE__ */ o.jsx("th", { scope: "row", children: N.label }),
      /* @__PURE__ */ o.jsx("td", { children: N.planned }),
      /* @__PURE__ */ o.jsx("td", { children: N.recorded }),
      /* @__PURE__ */ o.jsx("td", { children: N.received })
    ] }, N.id)) })
  ] }) }) : null;
}
function xy({ view: b, dispatch: N, actions: D }) {
  var vl;
  const { windows: h = [], targets: J = [], conditions: I = [] } = b;
  return /* @__PURE__ */ o.jsxs(o.Fragment, { children: [
    /* @__PURE__ */ o.jsxs("header", { className: "campaign-panel-title", children: [
      /* @__PURE__ */ o.jsx(Dy, { "aria-hidden": "true" }),
      /* @__PURE__ */ o.jsx("h1", { children: b.name })
    ] }),
    /* @__PURE__ */ o.jsx("h2", { className: "campaign-question", children: b.question }),
    /* @__PURE__ */ o.jsx(om, { items: [
      ...b.product ? [{ label: "Deliverable", value: b.product }] : [],
      ...b.beneficiary ? [{ label: "Mission partner", value: b.beneficiary }] : [],
      ...b.instrument ? [{ label: "Required instrument", value: b.instrument }] : [],
      ...b.metrics ?? []
    ] }),
    (vl = b.planOptions) != null && vl.length ? /* @__PURE__ */ o.jsxs("fieldset", { className: "campaign-plan", children: [
      /* @__PURE__ */ o.jsx("legend", { children: b.family === "transfer" ? "Choose the encounter plan" : "Choose the observation plan" }),
      /* @__PURE__ */ o.jsx("div", { className: "campaign-plan-options", children: b.planOptions.map(
        (Z) => /* @__PURE__ */ o.jsxs(
          "button",
          {
            type: "button",
            "data-evidence-plan": Z.id,
            "aria-pressed": b.selectedPlan === Z.id,
            onClick: () => N("evidencePlan", Z.id),
            children: [
              /* @__PURE__ */ o.jsx("strong", { children: Z.label }),
              /* @__PURE__ */ o.jsx("span", { children: Z.detail })
            ]
          },
          Z.id
        )
      ) })
    ] }) : null,
    D,
    /* @__PURE__ */ o.jsxs("div", { className: "campaign-columns", children: [
      /* @__PURE__ */ o.jsxs("section", { className: "campaign-plate", children: [
        /* @__PURE__ */ o.jsx("h2", { children: b.family === "relay" ? "Plan relay service" : b.family === "transfer" ? "Plan the encounter" : "Plan the observation" }),
        /* @__PURE__ */ o.jsx("p", { children: b.decision }),
        I.map((Z) => /* @__PURE__ */ o.jsx("p", { children: Z }, Z)),
        b.sourceAvailable && /* @__PURE__ */ o.jsxs("label", { className: "campaign-choice", children: [
          "Mission approach",
          /* @__PURE__ */ o.jsxs("select", { value: b.selectedSource ?? "", onChange: (Z) => N("approach", Z.target.value), children: [
            /* @__PURE__ */ o.jsx("option", { value: "", children: "Guided scenario" }),
            /* @__PURE__ */ o.jsx("option", { value: b.sourceAvailable, children: "Archived NASA context" })
          ] })
        ] }),
        /* @__PURE__ */ o.jsx("p", { className: "campaign-meta", children: b.source })
      ] }),
      /* @__PURE__ */ o.jsxs("section", { className: "campaign-plate", children: [
        /* @__PURE__ */ o.jsx("h2", { children: h.length ? "Target schedule" : "Encounter targets" }),
        /* @__PURE__ */ o.jsxs("ul", { className: "campaign-schedule", children: [
          h.map(
            (Z) => /* @__PURE__ */ o.jsxs("li", { children: [
              /* @__PURE__ */ o.jsx("span", { children: Z.label }),
              /* @__PURE__ */ o.jsxs("strong", { children: [
                Z.start,
                "–",
                Z.end,
                " min"
              ] })
            ] }, Z.label)
          ),
          J.map((Z) => /* @__PURE__ */ o.jsx("li", { children: Z }, Z))
        ] }),
        h.length > 0 && /* @__PURE__ */ o.jsx("p", { className: "campaign-meta", children: "Minutes from deployment. Contact and lighting depend on the flown orbit." }),
        b.deadlineMinutes != null && /* @__PURE__ */ o.jsxs("p", { children: [
          "Receipt deadline · ",
          b.deadlineMinutes,
          " min"
        ] }),
        b.encounterHours != null && /* @__PURE__ */ o.jsxs("p", { children: [
          "Modeled total integration · ",
          b.encounterHours,
          " h"
        ] })
      ] })
    ] })
  ] });
}
function Cy({ kind: b, controller: N }) {
  var Z, fl, _l;
  const D = It.useSyncExternalStore(N.subscribe, N.getSnapshot), [h, J] = It.useState("");
  function I(M, T) {
    J("");
    const H = N.dispatch(M, T);
    H.ok || J(H.reason ?? "Action rejected.");
  }
  const vl = (Z = D.actions) != null && Z.length ? /* @__PURE__ */ o.jsx("div", { className: "campaign-panel-actions", children: D.actions.map(
    (M) => /* @__PURE__ */ o.jsxs(
      "button",
      {
        type: "button",
        id: M.id,
        disabled: M.disabled,
        className: "orbital-btn" + (M.primary ? " orbital-btn-primary" : ""),
        onClick: () => I(M.id, M.value),
        children: [
          M.label,
          M.primary && /* @__PURE__ */ o.jsx(Ty, { size: 16, "aria-hidden": "true" })
        ]
      },
      M.id
    )
  ) }) : null;
  return /* @__PURE__ */ o.jsxs("section", { className: "campaign-panel campaign-panel-" + b, "aria-label": b === "brief" ? "Mission briefing" : b === "report" ? "Mission result" : b === "flight" ? "Flight controls" : b === "fit" ? "Stowed spacecraft fit" : "Mission evidence", children: [
    b === "brief" ? /* @__PURE__ */ o.jsx(xy, { view: D, dispatch: I, actions: vl }) : /* @__PURE__ */ o.jsxs(o.Fragment, { children: [
      D.name && /* @__PURE__ */ o.jsxs("header", { className: "campaign-panel-title", children: [
        b === "fit" || b === "flight" ? /* @__PURE__ */ o.jsx(zy, { "aria-hidden": "true" }) : /* @__PURE__ */ o.jsx(Oy, { "aria-hidden": "true" }),
        /* @__PURE__ */ o.jsx("h2", { children: D.name })
      ] }),
      D.outcome && /* @__PURE__ */ o.jsx("p", { className: "campaign-outcome", "data-result": D.status, children: D.outcome }),
      D.message && /* @__PURE__ */ o.jsx("p", { children: D.message }),
      /* @__PURE__ */ o.jsx(om, { items: D.metrics }),
      /* @__PURE__ */ o.jsx(My, { rows: D.rows }),
      (fl = D.log) != null && fl.length ? /* @__PURE__ */ o.jsxs("details", { className: "campaign-log", children: [
        /* @__PURE__ */ o.jsx("summary", { children: "Flight log" }),
        /* @__PURE__ */ o.jsx("ol", { children: D.log.map((M, T) => /* @__PURE__ */ o.jsx("li", { children: M }, T)) })
      ] }) : null,
      (_l = D.notes) == null ? void 0 : _l.map((M) => /* @__PURE__ */ o.jsx("p", { className: "campaign-meta", children: M }, M))
    ] }),
    b !== "brief" && vl,
    h && /* @__PURE__ */ o.jsx("p", { className: "campaign-rejection", role: "alert", children: h })
  ] });
}
var _s = { exports: {} }, un = {}, Es = { exports: {} }, zs = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var am;
function jy() {
  return am || (am = 1, (function(b) {
    function N(A, Y) {
      var G = A.length;
      A.push(Y);
      l: for (; 0 < G; ) {
        var hl = G - 1 >>> 1, il = A[hl];
        if (0 < J(il, Y))
          A[hl] = Y, A[G] = il, G = hl;
        else break l;
      }
    }
    function D(A) {
      return A.length === 0 ? null : A[0];
    }
    function h(A) {
      if (A.length === 0) return null;
      var Y = A[0], G = A.pop();
      if (G !== Y) {
        A[0] = G;
        l: for (var hl = 0, il = A.length, xt = il >>> 1; hl < xt; ) {
          var Pt = 2 * (hl + 1) - 1, Fa = A[Pt], d = Pt + 1, z = A[d];
          if (0 > J(Fa, G))
            d < il && 0 > J(z, Fa) ? (A[hl] = z, A[d] = G, hl = d) : (A[hl] = Fa, A[Pt] = G, hl = Pt);
          else if (d < il && 0 > J(z, G))
            A[hl] = z, A[d] = G, hl = d;
          else break l;
        }
      }
      return Y;
    }
    function J(A, Y) {
      var G = A.sortIndex - Y.sortIndex;
      return G !== 0 ? G : A.id - Y.id;
    }
    if (b.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var I = performance;
      b.unstable_now = function() {
        return I.now();
      };
    } else {
      var vl = Date, Z = vl.now();
      b.unstable_now = function() {
        return vl.now() - Z;
      };
    }
    var fl = [], _l = [], M = 1, T = null, H = 3, B = !1, gl = !1, Kl = !1, rl = !1, Jl = typeof setTimeout == "function" ? setTimeout : null, ut = typeof clearTimeout == "function" ? clearTimeout : null, Ja = typeof setImmediate < "u" ? setImmediate : null;
    function Bt(A) {
      for (var Y = D(_l); Y !== null; ) {
        if (Y.callback === null) h(_l);
        else if (Y.startTime <= A)
          h(_l), Y.sortIndex = Y.expirationTime, N(fl, Y);
        else break;
        Y = D(_l);
      }
    }
    function qt(A) {
      if (Kl = !1, Bt(A), !gl)
        if (D(fl) !== null)
          gl = !0, nt || (nt = !0, it());
        else {
          var Y = D(_l);
          Y !== null && Ul(qt, Y.startTime - A);
        }
    }
    var nt = !1, w = -1, el = 5, Yt = -1;
    function St() {
      return rl ? !0 : !(b.unstable_now() - Yt < el);
    }
    function bt() {
      if (rl = !1, nt) {
        var A = b.unstable_now();
        Yt = A;
        var Y = !0;
        try {
          l: {
            gl = !1, Kl && (Kl = !1, ut(w), w = -1), B = !0;
            var G = H;
            try {
              t: {
                for (Bt(A), T = D(fl); T !== null && !(T.expirationTime > A && St()); ) {
                  var hl = T.callback;
                  if (typeof hl == "function") {
                    T.callback = null, H = T.priorityLevel;
                    var il = hl(
                      T.expirationTime <= A
                    );
                    if (A = b.unstable_now(), typeof il == "function") {
                      T.callback = il, Bt(A), Y = !0;
                      break t;
                    }
                    T === D(fl) && h(fl), Bt(A);
                  } else h(fl);
                  T = D(fl);
                }
                if (T !== null) Y = !0;
                else {
                  var xt = D(_l);
                  xt !== null && Ul(
                    qt,
                    xt.startTime - A
                  ), Y = !1;
                }
              }
              break l;
            } finally {
              T = null, H = G, B = !1;
            }
            Y = void 0;
          }
        } finally {
          Y ? it() : nt = !1;
        }
      }
    }
    var it;
    if (typeof Ja == "function")
      it = function() {
        Ja(bt);
      };
    else if (typeof MessageChannel < "u") {
      var ya = new MessageChannel(), wa = ya.port2;
      ya.port1.onmessage = bt, it = function() {
        wa.postMessage(null);
      };
    } else
      it = function() {
        Jl(bt, 0);
      };
    function Ul(A, Y) {
      w = Jl(function() {
        A(b.unstable_now());
      }, Y);
    }
    b.unstable_IdlePriority = 5, b.unstable_ImmediatePriority = 1, b.unstable_LowPriority = 4, b.unstable_NormalPriority = 3, b.unstable_Profiling = null, b.unstable_UserBlockingPriority = 2, b.unstable_cancelCallback = function(A) {
      A.callback = null;
    }, b.unstable_forceFrameRate = function(A) {
      0 > A || 125 < A ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : el = 0 < A ? Math.floor(1e3 / A) : 5;
    }, b.unstable_getCurrentPriorityLevel = function() {
      return H;
    }, b.unstable_next = function(A) {
      switch (H) {
        case 1:
        case 2:
        case 3:
          var Y = 3;
          break;
        default:
          Y = H;
      }
      var G = H;
      H = Y;
      try {
        return A();
      } finally {
        H = G;
      }
    }, b.unstable_requestPaint = function() {
      rl = !0;
    }, b.unstable_runWithPriority = function(A, Y) {
      switch (A) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          A = 3;
      }
      var G = H;
      H = A;
      try {
        return Y();
      } finally {
        H = G;
      }
    }, b.unstable_scheduleCallback = function(A, Y, G) {
      var hl = b.unstable_now();
      switch (typeof G == "object" && G !== null ? (G = G.delay, G = typeof G == "number" && 0 < G ? hl + G : hl) : G = hl, A) {
        case 1:
          var il = -1;
          break;
        case 2:
          il = 250;
          break;
        case 5:
          il = 1073741823;
          break;
        case 4:
          il = 1e4;
          break;
        default:
          il = 5e3;
      }
      return il = G + il, A = {
        id: M++,
        callback: Y,
        priorityLevel: A,
        startTime: G,
        expirationTime: il,
        sortIndex: -1
      }, G > hl ? (A.sortIndex = G, N(_l, A), D(fl) === null && A === D(_l) && (Kl ? (ut(w), w = -1) : Kl = !0, Ul(qt, G - hl))) : (A.sortIndex = il, N(fl, A), gl || B || (gl = !0, nt || (nt = !0, it()))), A;
    }, b.unstable_shouldYield = St, b.unstable_wrapCallback = function(A) {
      var Y = H;
      return function() {
        var G = H;
        H = Y;
        try {
          return A.apply(this, arguments);
        } finally {
          H = G;
        }
      };
    };
  })(zs)), zs;
}
var em;
function Uy() {
  return em || (em = 1, Es.exports = jy()), Es.exports;
}
var Ns = { exports: {} }, Ll = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var um;
function py() {
  if (um) return Ll;
  um = 1;
  var b = Os();
  function N(M) {
    var T = "https://react.dev/errors/" + M;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var H = 2; H < arguments.length; H++)
        T += "&args[]=" + encodeURIComponent(arguments[H]);
    }
    return "Minified React error #" + M + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function D() {
  }
  var h = {
    d: {
      f: D,
      r: function() {
        throw Error(N(522));
      },
      D,
      C: D,
      L: D,
      m: D,
      X: D,
      S: D,
      M: D
    },
    p: 0,
    findDOMNode: null
  }, J = Symbol.for("react.portal"), I = Symbol.for("react.recoverable"), vl = Symbol.for("react.optimistic_key");
  function Z(M, T, H) {
    var B = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: J,
      key: B == null ? null : B === vl ? vl : "" + B,
      children: M,
      containerInfo: T,
      implementation: H
    };
  }
  var fl = b.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function _l(M, T) {
    if (M === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return Ll.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = h, Ll.browser = function(M) {
    return { $$typeof: I, _reason: M };
  }, Ll.createPortal = function(M, T) {
    var H = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(N(299));
    return Z(M, T, null, H);
  }, Ll.flushSync = function(M) {
    var T = fl.T, H = h.p;
    try {
      if (fl.T = null, h.p = 2, M) return M();
    } finally {
      fl.T = T, h.p = H, h.d.f();
    }
  }, Ll.preconnect = function(M, T) {
    typeof M == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, h.d.C(M, T));
  }, Ll.prefetchDNS = function(M) {
    typeof M == "string" && h.d.D(M);
  }, Ll.preinit = function(M, T) {
    if (typeof M == "string" && T && typeof T.as == "string") {
      var H = T.as, B = _l(H, T.crossOrigin), gl = typeof T.integrity == "string" ? T.integrity : void 0, Kl = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      H === "style" ? h.d.S(
        M,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: B,
          integrity: gl,
          fetchPriority: Kl
        }
      ) : H === "script" && h.d.X(M, {
        crossOrigin: B,
        integrity: gl,
        fetchPriority: Kl,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, Ll.preinitModule = function(M, T) {
    if (typeof M == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var H = _l(
            T.as,
            T.crossOrigin
          );
          h.d.M(M, {
            crossOrigin: H,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && h.d.M(M);
  }, Ll.preload = function(M, T) {
    if (typeof M == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var H = T.as, B = _l(H, T.crossOrigin);
      h.d.L(M, H, {
        crossOrigin: B,
        integrity: typeof T.integrity == "string" ? T.integrity : void 0,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0,
        type: typeof T.type == "string" ? T.type : void 0,
        fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0,
        referrerPolicy: typeof T.referrerPolicy == "string" ? T.referrerPolicy : void 0,
        imageSrcSet: typeof T.imageSrcSet == "string" ? T.imageSrcSet : void 0,
        imageSizes: typeof T.imageSizes == "string" ? T.imageSizes : void 0,
        media: typeof T.media == "string" ? T.media : void 0
      });
    }
  }, Ll.preloadModule = function(M, T) {
    if (typeof M == "string")
      if (T) {
        var H = _l(T.as, T.crossOrigin);
        h.d.m(M, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: H,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else h.d.m(M);
  }, Ll.requestFormReset = function(M) {
    h.d.r(M);
  }, Ll.unstable_batchedUpdates = function(M, T) {
    return M(T);
  }, Ll.useFormState = function(M, T, H) {
    return fl.H.useFormState(M, T, H);
  }, Ll.useFormStatus = function() {
    return fl.H.useHostTransitionStatus();
  }, Ll.version = "19.3.1", Ll;
}
var nm;
function Ry() {
  if (nm) return Ns.exports;
  nm = 1;
  function b() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b);
      } catch (N) {
        console.error(N);
      }
  }
  return b(), Ns.exports = py(), Ns.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var im;
function Hy() {
  if (im) return un;
  im = 1;
  var b = Uy(), N = Os(), D = Ry();
  function h(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function J(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function I(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function vl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Z(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function fl(l) {
    if (I(l) !== l)
      throw Error(h(188));
  }
  function _l(l) {
    var t = l.alternate;
    if (!t) {
      if (t = I(l), t === null) throw Error(h(188));
      return t !== l ? null : l;
    }
    for (var a = l, e = t; ; ) {
      var u = a.return;
      if (u === null) break;
      var n = u.alternate;
      if (n === null) {
        if (e = u.return, e !== null) {
          a = e;
          continue;
        }
        break;
      }
      if (u.child === n.child) {
        for (n = u.child; n; ) {
          if (n === a) return fl(u), l;
          if (n === e) return fl(u), t;
          n = n.sibling;
        }
        throw Error(h(188));
      }
      if (a.return !== e.return) a = u, e = n;
      else {
        for (var i = !1, c = u.child; c; ) {
          if (c === a) {
            i = !0, a = u, e = n;
            break;
          }
          if (c === e) {
            i = !0, e = u, a = n;
            break;
          }
          c = c.sibling;
        }
        if (!i) {
          for (c = n.child; c; ) {
            if (c === a) {
              i = !0, a = n, e = u;
              break;
            }
            if (c === e) {
              i = !0, e = n, a = u;
              break;
            }
            c = c.sibling;
          }
          if (!i) throw Error(h(189));
        }
      }
      if (a.alternate !== e) throw Error(h(190));
    }
    if (a.tag !== 3) throw Error(h(188));
    return a.stateNode.current === a ? l : t;
  }
  function M(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = M(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  function T(l, t, a, e, u, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && a(l, e, u, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && T(
        l.child,
        t,
        a,
        e,
        u,
        n
      ))
        return !0;
      l = l.sibling;
    }
    return !1;
  }
  function H(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function B(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function gl(l) {
    var t = [null, null], a = H(l);
    return a === null || Kl(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function Kl(l, t, a, e) {
    for (; a !== null; ) {
      if (a === t) e.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (e.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && Kl(
        l,
        t,
        a.child,
        e
      ))
        return !0;
      a = a.sibling;
    }
    return !1;
  }
  function rl(l) {
    switch (l.tag) {
      case 5:
      case 27:
      case 6:
        return l.stateNode;
      case 3:
        return l.stateNode.containerInfo;
      default:
        throw Error(h(559));
    }
  }
  var Jl = null, ut = null;
  function Ja(l, t, a) {
    return l === a ? !0 : l === t ? (Jl = l, !0) : !1;
  }
  function Bt(l, t, a) {
    return l === a ? (ut = l, !1) : l === t ? (ut !== null && (Jl = l), !0) : !1;
  }
  function qt(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function nt(l, t, a) {
    for (var e = 0, u = l; u; u = a(u)) e++;
    u = 0;
    for (var n = t; n; n = a(n)) u++;
    for (; 0 < e - u; ) l = a(l), e--;
    for (; 0 < u - e; ) t = a(t), u--;
    for (; e--; ) {
      if (l === t || t !== null && l === t.alternate)
        return l;
      l = a(l), t = a(t);
    }
    return null;
  }
  var w = Object.assign, el = Symbol.for("react.element"), Yt = Symbol.for("react.transitional.element"), St = Symbol.for("react.portal"), bt = Symbol.for("react.fragment"), it = Symbol.for("react.strict_mode"), ya = Symbol.for("react.profiler"), wa = Symbol.for("react.consumer"), Ul = Symbol.for("react.context"), A = Symbol.for("react.forward_ref"), Y = Symbol.for("react.suspense"), G = Symbol.for("react.suspense_list"), hl = Symbol.for("react.memo"), il = Symbol.for("react.lazy"), xt = Symbol.for("react.activity"), Pt = Symbol.for("react.legacy_hidden"), Fa = Symbol.for("react.memo_cache_sentinel"), d = Symbol.for("react.view_transition"), z = Symbol.for("react.recoverable"), p = Symbol.iterator;
  function R(l) {
    return l === null || typeof l != "object" ? null : (l = p && l[p] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var ll = Symbol.for("react.client.reference");
  function tl(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === ll ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case bt:
        return "Fragment";
      case ya:
        return "Profiler";
      case it:
        return "StrictMode";
      case Y:
        return "Suspense";
      case G:
        return "SuspenseList";
      case xt:
        return "Activity";
      case d:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case St:
          return "Portal";
        case Ul:
          return l.displayName || "Context";
        case wa:
          return (l._context.displayName || "Context") + ".Consumer";
        case A:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case hl:
          return t = l.displayName || null, t !== null ? t : tl(l.type) || "Memo";
        case il:
          t = l._payload, l = l._init;
          try {
            return tl(l(t));
          } catch {
          }
      }
    return null;
  }
  var ul = Array.isArray, j = N.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, X = D.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, la = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, qi = [], Se = -1;
  function Gt(l) {
    return { current: l };
  }
  function ql(l) {
    0 > Se || (l.current = qi[Se], qi[Se] = null, Se--);
  }
  function Sl(l, t) {
    Se++, qi[Se] = l.current, l.current = t;
  }
  var Xt = Gt(null), su = Gt(null), ga = Gt(null), cn = Gt(null);
  function fn(l, t) {
    switch (Sl(ga, t), Sl(su, l), Sl(Xt, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? i0(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = i0(t), l = c0(t, l);
        else
          switch (l) {
            case "svg":
              l = 1;
              break;
            case "math":
              l = 2;
              break;
            default:
              l = 0;
          }
    }
    ql(Xt), Sl(Xt, l);
  }
  function be() {
    ql(Xt), ql(su), ql(ga);
  }
  function Yi(l) {
    var t = l.memoizedState;
    t !== null && (iu._currentValue = t.memoizedState, Sl(cn, l)), t = Xt.current;
    var a = c0(t, l.type);
    t !== a && (Sl(su, l), Sl(Xt, a));
  }
  function sn(l) {
    su.current === l && (ql(Xt), ql(su)), cn.current === l && (ql(cn), iu._currentValue = la);
  }
  var Gi, As;
  function Sa(l) {
    if (Gi === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Gi = t && t[1] || "", As = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Gi + l + As;
  }
  var Xi = !1;
  function Qi(l, t) {
    if (!l || Xi) return "";
    Xi = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var e = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var E = function() {
                throw Error();
              };
              if (Object.defineProperty(E.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(E, []);
                } catch (O) {
                  var r = O;
                }
                Reflect.construct(l, [], E);
              } else {
                try {
                  E.call();
                } catch (O) {
                  r = O;
                }
                E = !1;
                try {
                  var g = Object.getOwnPropertyDescriptor(
                    l.prototype,
                    "props"
                  );
                  Object.defineProperty(l.prototype, "props", {
                    configurable: !0,
                    set: function() {
                      throw Error();
                    }
                  }), E = !0, new l();
                } finally {
                  E && (g !== void 0 ? Object.defineProperty(l.prototype, "props", g) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (O) {
                r = O;
              }
              (E = l()) && typeof E.catch == "function" && E.catch(function() {
              });
            }
          } catch (O) {
            if (O && r && typeof O.stack == "string")
              return [O.stack, r.stack];
          }
          return [null, null];
        }
      };
      e.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var u = Object.getOwnPropertyDescriptor(
        e.DetermineComponentFrameRoot,
        "name"
      );
      u && u.configurable && Object.defineProperty(
        e.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = e.DetermineComponentFrameRoot(), i = n[0], c = n[1];
      if (i && c) {
        var f = i.split(`
`), v = c.split(`
`);
        for (u = e = 0; e < f.length && !f[e].includes("DetermineComponentFrameRoot"); )
          e++;
        for (; u < v.length && !v[u].includes(
          "DetermineComponentFrameRoot"
        ); )
          u++;
        if (e === f.length || u === v.length)
          for (e = f.length - 1, u = v.length - 1; 1 <= e && 0 <= u && f[e] !== v[u]; )
            u--;
        for (; 1 <= e && 0 <= u; e--, u--)
          if (f[e] !== v[u]) {
            if (e !== 1 || u !== 1)
              do
                if (e--, u--, 0 > u || f[e] !== v[u]) {
                  var S = `
` + f[e].replace(" at new ", " at ");
                  return l.displayName && S.includes("<anonymous>") && (S = S.replace("<anonymous>", l.displayName)), S;
                }
              while (1 <= e && 0 <= u);
            break;
          }
      }
    } finally {
      Xi = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? Sa(a) : "";
  }
  function mm(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return Sa(l.type);
      case 16:
        return Sa("Lazy");
      case 13:
        return l.child !== t && t !== null ? Sa("Suspense Fallback") : Sa("Suspense");
      case 19:
        return Sa("SuspenseList");
      case 0:
      case 15:
        return Qi(l.type, !1);
      case 11:
        return Qi(l.type.render, !1);
      case 1:
        return Qi(l.type, !0);
      case 31:
        return Sa("Activity");
      case 30:
        return Sa("ViewTransition");
      default:
        return "";
    }
  }
  function Ds(l) {
    try {
      var t = "", a = null;
      do
        t += mm(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (e) {
      return `
Error generating stack: ` + e.message + `
` + e.stack;
    }
  }
  var Zi = Object.prototype.hasOwnProperty, Vi = b.unstable_scheduleCallback, Li = b.unstable_cancelCallback, vm = b.unstable_shouldYield, hm = b.unstable_requestPaint, ct = b.unstable_now, ym = b.unstable_getCurrentPriorityLevel, Ms = b.unstable_ImmediatePriority, xs = b.unstable_UserBlockingPriority, on = b.unstable_NormalPriority, gm = b.unstable_LowPriority, Cs = b.unstable_IdlePriority, Sm = b.log, bm = b.unstable_setDisableYieldValue, ou = null, ft = null;
  function ba(l) {
    if (typeof Sm == "function" && bm(l), ft && typeof ft.setStrictMode == "function")
      try {
        ft.setStrictMode(ou, l);
      } catch {
      }
  }
  var st = Math.clz32 ? Math.clz32 : Em, Tm = Math.log, _m = Math.LN2;
  function Em(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Tm(l) / _m | 0) | 0;
  }
  var dn = 256, rn = 262144, mn = 4194304;
  function $a(l) {
    var t = l & 42;
    if (t !== 0) return t;
    switch (l & -l) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return l & -l;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return l & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return l & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return l;
    }
  }
  function vn(l, t, a) {
    var e = l.pendingLanes;
    if (e === 0) return 0;
    var u = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = e & 134217727;
    return c !== 0 ? (e = c & ~n, e !== 0 ? u = $a(e) : (i &= c, i !== 0 ? u = $a(i) : a || (a = c & ~l, a !== 0 && (u = $a(a))))) : (c = e & ~n, c !== 0 ? u = $a(c) : i !== 0 ? u = $a(i) : a || (a = e & ~l, a !== 0 && (u = $a(a)))), u === 0 ? 0 : t !== 0 && t !== u && (t & n) === 0 && (n = u & -u, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : u;
  }
  function du(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function js(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var e = 31 - st(a), u = 1 << e;
        t |= l[e], a &= ~u;
      }
    return t;
  }
  function zm(l, t) {
    switch (l) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Us() {
    var l = mn;
    return mn <<= 1, (mn & 62914560) === 0 && (mn = 4194304), l;
  }
  function Ki(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function ru(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Nm(l, t, a, e, u, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, v = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var S = 31 - st(a), E = 1 << S;
      c[S] = 0, f[S] = -1;
      var r = v[S];
      if (r !== null)
        for (v[S] = null, S = 0; S < r.length; S++) {
          var g = r[S];
          g !== null && (g.lane &= -536870913);
        }
      a &= ~E;
    }
    e !== 0 && ps(l, e, 0), n !== 0 && u === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function ps(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var e = 31 - st(t);
    l.entangledLanes |= t, l.entanglements[e] = l.entanglements[e] | 1073741824 | a & 261930;
  }
  function Rs(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var e = 31 - st(a), u = 1 << e;
      u & t | l[e] & t && (l[e] |= t), a &= ~u;
    }
  }
  function Hs(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : Ji(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function Ji(l) {
    switch (l) {
      case 2:
        l = 1;
        break;
      case 8:
        l = 4;
        break;
      case 32:
        l = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        l = 128;
        break;
      case 268435456:
        l = 134217728;
        break;
      default:
        l = 0;
    }
    return l;
  }
  function wi(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Bs() {
    var l = X.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : L0(l.type));
  }
  function qs(l, t) {
    var a = X.p;
    try {
      return X.p = l, t();
    } finally {
      X.p = a;
    }
  }
  var ta = Math.random().toString(36).slice(2), Yl = "__reactFiber$" + ta, Il = "__reactProps$" + ta, Te = "__reactContainer$" + ta, Ys = "__reactEvents$" + ta, Om = "__reactListeners$" + ta, Am = "__reactHandles$" + ta, Gs = "__reactResources$" + ta, mu = "__reactMarker$" + ta, hn = "__reactLoad$" + ta;
  function yn(l) {
    delete l[Yl], delete l[Il], delete l[Om], delete l[Am];
  }
  function Wa(l) {
    var t;
    if (t = l[Yl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[Te] || a[Yl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = N0(l); l !== null; ) {
            if (a = l[Yl]) return a;
            l = N0(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function _e(l) {
    if (l = l[Yl] || l[Te]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function vu(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(h(33));
  }
  function Ee(l) {
    var t = l[Gs];
    return t || (t = l[Gs] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function pl(l) {
    l[mu] = !0;
  }
  function Xs(l) {
    l[hn] = void 0;
  }
  var Qs = /* @__PURE__ */ new Set(), Zs = {};
  function ka(l, t) {
    ze(l, t), ze(l + "Capture", t);
  }
  function ze(l, t) {
    for (Zs[l] = t, l = 0; l < t.length; l++)
      Qs.add(t[l]);
  }
  var Dm = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Vs = {}, Ls = {};
  function Mm(l) {
    return Zi.call(Ls, l) ? !0 : Zi.call(Vs, l) ? !1 : Dm.test(l) ? Ls[l] = !0 : (Vs[l] = !0, !1);
  }
  var al = !1;
  function Ks() {
    var l = al;
    return al = !1, l;
  }
  function gn(l, t, a) {
    if (Mm(t))
      if (a === null) l.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var e = t.toLowerCase().slice(0, 5);
            if (e !== "data-" && e !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, a);
      }
  }
  function Sn(l, t, a) {
    if (a === null) l.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(t);
          return;
      }
      l.setAttribute(t, a);
    }
  }
  function aa(l, t, a, e) {
    if (e === null) l.removeAttribute(a);
    else {
      switch (typeof e) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(a);
          return;
      }
      l.setAttributeNS(t, a, e);
    }
  }
  function ot(l) {
    switch (typeof l) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return l;
      case "object":
        return l;
      default:
        return "";
    }
  }
  function Js(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function xm(l, t, a) {
    var e = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof e < "u" && typeof e.get == "function" && typeof e.set == "function") {
      var u = e.get, n = e.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return u.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: e.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(i) {
          a = "" + i;
        },
        stopTracking: function() {
          l._valueTracker = null, delete l[t];
        }
      };
    }
  }
  function Fi(l) {
    if (!l._valueTracker) {
      var t = Js(l) ? "checked" : "value";
      l._valueTracker = xm(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function ws(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), e = "";
    return l && (e = Js(l) ? l.checked ? "true" : "false" : l.value), l = e, l !== a ? (t.setValue(l), !0) : !1;
  }
  var Cm = /[\n"\\]/g;
  function Tt(l) {
    return l.replace(
      Cm,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function $i(l, t, a, e, u, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + ot(t)) : l.value !== "" + ot(t) && (l.value = "" + ot(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Wi(l, ot(l.value)) : Wi(l, ot(t)) : a != null ? Wi(l, ot(a)) : e != null && l.removeAttribute("value"), u == null && n != null && (l.defaultChecked = !!n), u != null && (l.checked = u && typeof u != "function" && typeof u != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + ot(c) : l.removeAttribute("name");
  }
  function Fs(l, t, a, e, u, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        Fi(l);
        return;
      }
      a = a != null ? "" + ot(a) : "", t = t != null ? "" + ot(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    e = e ?? u, e = typeof e != "function" && typeof e != "symbol" && !!e, l.checked = c ? l.checked : !!e, l.defaultChecked = !!e, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), Fi(l);
  }
  function Wi(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function Ne(l, t, a, e) {
    if (l = l.options, t) {
      t = {};
      for (var u = 0; u < a.length; u++)
        t["$" + a[u]] = !0;
      for (a = 0; a < l.length; a++)
        u = t.hasOwnProperty("$" + l[a].value), l[a].selected !== u && (l[a].selected = u), u && e && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + ot(a), t = null, u = 0; u < l.length; u++) {
        if (l[u].value === a) {
          l[u].selected = !0, e && (l[u].defaultSelected = !0);
          return;
        }
        t !== null || l[u].disabled || (t = l[u]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function $s(l, t, a) {
    if (t != null && (t = "" + ot(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + ot(a) : "";
  }
  function Ws(l, t, a, e) {
    if (t == null) {
      if (e != null) {
        if (a != null) throw Error(h(92));
        if (ul(e)) {
          if (1 < e.length) throw Error(h(93));
          e = e[0];
        }
        a = e;
      }
      a == null && (a = ""), t = a;
    }
    a = ot(t), l.defaultValue = a, e = l.textContent, e === a && e !== "" && e !== null && (l.value = e), Fi(l);
  }
  function Oe(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var jm = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ks(l, t, a) {
    var e = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? e ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : e ? l.setProperty(t, a) : typeof a != "number" || a === 0 || jm.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function Is(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(h(62));
    if (l = l.style, a != null) {
      for (var e in a)
        !a.hasOwnProperty(e) || t != null && t.hasOwnProperty(e) || (e.indexOf("--") === 0 ? l.setProperty(e, "") : e === "float" ? l.cssFloat = "" : l[e] = "", al = !0);
      for (var u in t)
        e = t[u], t.hasOwnProperty(u) && a[u] !== e && (ks(l, u, e), al = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && ks(l, n, t[n]);
  }
  function ki(l) {
    if (l.indexOf("-") === -1) return !1;
    switch (l) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Um = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), pm = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function bn(l) {
    return pm.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Qt() {
  }
  var Ii = null;
  function Pi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Ae = null, De = null;
  function Ps(l) {
    var t = _e(l);
    if (t && (l = t.stateNode)) {
      var a = l[Il] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if ($i(
            l,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), t = a.name, a.type === "radio" && t != null) {
            for (a = l; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + Tt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var e = a[t];
              if (e !== l && e.form === l.form) {
                var u = e[Il] || null;
                if (!u) throw Error(h(90));
                $i(
                  e,
                  u.value,
                  u.defaultValue,
                  u.defaultValue,
                  u.checked,
                  u.defaultChecked,
                  u.type,
                  u.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              e = a[t], e.form === l.form && ws(e);
          }
          break l;
        case "textarea":
          $s(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Ne(l, !!a.multiple, t, !1);
      }
    }
  }
  var lc = !1;
  function lo(l, t, a) {
    if (lc) return l(t, a);
    lc = !0;
    try {
      var e = l(t);
      return e;
    } finally {
      if (lc = !1, (Ae !== null || De !== null) && (bi(), Ae && (t = Ae, l = De, De = Ae = null, Ps(t), l)))
        for (t = 0; t < l.length; t++) Ps(l[t]);
    }
  }
  function hu(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var e = a[Il] || null;
    if (e === null) return null;
    a = e[t];
    l: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (e = !e.disabled) || (l = l.type, e = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !e;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (a && typeof a != "function")
      throw Error(
        h(231, t, typeof a)
      );
    return a;
  }
  var ea = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), tc = !1;
  if (ea)
    try {
      var yu = {};
      Object.defineProperty(yu, "passive", {
        get: function() {
          tc = !0;
        }
      }), window.addEventListener("test", yu, yu), window.removeEventListener("test", yu, yu);
    } catch {
      tc = !1;
    }
  var Ta = null, ac = null, Tn = null;
  function to() {
    if (Tn) return Tn;
    var l, t = ac, a = t.length, e, u = "value" in Ta ? Ta.value : Ta.textContent, n = u.length;
    for (l = 0; l < a && t[l] === u[l]; l++) ;
    var i = a - l;
    for (e = 1; e <= i && t[a - e] === u[n - e]; e++) ;
    return Tn = u.slice(l, 1 < e ? 1 - e : void 0);
  }
  function _n(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function En() {
    return !0;
  }
  function ao() {
    return !1;
  }
  function Fl(l) {
    function t(a, e, u, n, i) {
      this._reactName = a, this._targetInst = u, this.type = e, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? En : ao, this.isPropagationStopped = ao, this;
    }
    return w(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = En);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = En);
      },
      persist: function() {
      },
      isPersistent: En
    }), t;
  }
  var _a = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, zn = Fl(_a), gu = w({}, _a, { view: 0, detail: 0 }), Rm = Fl(gu), ec, uc, Su, Nn = w({}, gu, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: ic,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Su && (Su && l.type === "mousemove" ? (ec = l.screenX - Su.screenX, uc = l.screenY - Su.screenY) : uc = ec = 0, Su = l), ec);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : uc;
    }
  }), eo = Fl(Nn), Hm = w({}, Nn, { dataTransfer: 0 }), Bm = Fl(Hm), qm = w({}, gu, { relatedTarget: 0 }), nc = Fl(qm), Ym = w({}, _a, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Gm = Fl(Ym), Xm = w({}, _a, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Qm = Fl(Xm), Zm = w({}, _a, { data: 0 }), uo = Fl(Zm), Vm = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Lm = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Km = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Jm(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Km[l]) ? !!t[l] : !1;
  }
  function ic() {
    return Jm;
  }
  var wm = w({}, gu, {
    key: function(l) {
      if (l.key) {
        var t = Vm[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = _n(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Lm[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: ic,
    charCode: function(l) {
      return l.type === "keypress" ? _n(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? _n(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Fm = Fl(wm), $m = w({}, Nn, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), no = Fl($m), Wm = w({}, _a, { submitter: 0 }), km = Fl(Wm), Im = w({}, gu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: ic
  }), Pm = Fl(Im), lv = w({}, _a, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), tv = Fl(lv), av = w({}, Nn, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), ev = Fl(av), uv = w({}, _a, {
    newState: 0,
    oldState: 0,
    source: 0
  }), nv = Fl(uv), iv = [9, 13, 27, 32], cc = ea && "CompositionEvent" in window, bu = null;
  ea && "documentMode" in document && (bu = document.documentMode);
  var cv = ea && "TextEvent" in window && !bu, io = ea && (!cc || bu && 8 < bu && 11 >= bu), co = " ", fo = !1;
  function so(l, t) {
    switch (l) {
      case "keyup":
        return iv.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function oo(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Me = !1;
  function fv(l, t) {
    switch (l) {
      case "compositionend":
        return oo(t);
      case "keypress":
        return t.which !== 32 ? null : (fo = !0, co);
      case "textInput":
        return l = t.data, l === co && fo ? null : l;
      default:
        return null;
    }
  }
  function sv(l, t) {
    if (Me)
      return l === "compositionend" || !cc && so(l, t) ? (l = to(), Tn = ac = Ta = null, Me = !1, l) : null;
    switch (l) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return io && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var ov = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function ro(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!ov[l.type] : t === "textarea";
  }
  function mo(l, t, a, e) {
    Ae ? De ? De.push(e) : De = [e] : Ae = e, t = Oi(t, "onChange"), 0 < t.length && (a = new zn(
      "onChange",
      "change",
      null,
      a,
      e
    ), l.push({ event: a, listeners: t }));
  }
  var Tu = null, _u = null;
  function dv(l) {
    l0(l, 0);
  }
  function On(l) {
    var t = vu(l);
    if (ws(t)) return l;
  }
  function vo(l, t) {
    if (l === "change") return t;
  }
  var ho = !1;
  if (ea) {
    var fc;
    if (ea) {
      var sc = "oninput" in document;
      if (!sc) {
        var yo = document.createElement("div");
        yo.setAttribute("oninput", "return;"), sc = typeof yo.oninput == "function";
      }
      fc = sc;
    } else fc = !1;
    ho = fc && (!document.documentMode || 9 < document.documentMode);
  }
  function go() {
    Tu && (Tu.detachEvent("onpropertychange", So), _u = Tu = null);
  }
  function So(l) {
    if (l.propertyName === "value" && On(_u)) {
      var t = [];
      mo(
        t,
        _u,
        l,
        Pi(l)
      ), lo(dv, t);
    }
  }
  function rv(l, t, a) {
    l === "focusin" ? (go(), Tu = t, _u = a, Tu.attachEvent("onpropertychange", So)) : l === "focusout" && go();
  }
  function mv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return On(_u);
  }
  function vv(l, t) {
    if (l === "click") return On(t);
  }
  function hv(l, t) {
    if (l === "input" || l === "change")
      return On(t);
  }
  function yv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var dt = typeof Object.is == "function" ? Object.is : yv;
  function Eu(l, t) {
    if (dt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), e = Object.keys(t);
    if (a.length !== e.length) return !1;
    for (e = 0; e < a.length; e++) {
      var u = a[e];
      if (!Zi.call(t, u) || !dt(l[u], t[u]))
        return !1;
    }
    return !0;
  }
  function oc(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  function bo(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function To(l, t) {
    var a = bo(l);
    l = 0;
    for (var e; a; ) {
      if (a.nodeType === 3) {
        if (e = l + a.textContent.length, l <= t && e >= t)
          return { node: a, offset: t - l };
        l = e;
      }
      l: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break l;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = bo(a);
    }
  }
  function _o(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? _o(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Eo(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = oc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = oc(l.document);
    }
    return t;
  }
  function dc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var gv = ea && "documentMode" in document && 11 >= document.documentMode, xe = null, rc = null, zu = null, mc = !1;
  function zo(l, t, a) {
    var e = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    mc || xe == null || xe !== oc(e) || (e = xe, "selectionStart" in e && dc(e) ? e = { start: e.selectionStart, end: e.selectionEnd } : (e = (e.ownerDocument && e.ownerDocument.defaultView || window).getSelection(), e = {
      anchorNode: e.anchorNode,
      anchorOffset: e.anchorOffset,
      focusNode: e.focusNode,
      focusOffset: e.focusOffset
    }), zu && Eu(zu, e) || (zu = e, e = Oi(rc, "onSelect"), 0 < e.length && (t = new zn(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: e }), t.target = xe)));
  }
  function Ia(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var Ce = {
    animationend: Ia("Animation", "AnimationEnd"),
    animationiteration: Ia("Animation", "AnimationIteration"),
    animationstart: Ia("Animation", "AnimationStart"),
    transitionrun: Ia("Transition", "TransitionRun"),
    transitionstart: Ia("Transition", "TransitionStart"),
    transitioncancel: Ia("Transition", "TransitionCancel"),
    transitionend: Ia("Transition", "TransitionEnd")
  }, vc = {}, No = {};
  ea && (No = document.createElement("div").style, "AnimationEvent" in window || (delete Ce.animationend.animation, delete Ce.animationiteration.animation, delete Ce.animationstart.animation), "TransitionEvent" in window || delete Ce.transitionend.transition);
  function Pa(l) {
    if (vc[l]) return vc[l];
    if (!Ce[l]) return l;
    var t = Ce[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in No)
        return vc[l] = t[a];
    return l;
  }
  var Oo = Pa("animationend"), Ao = Pa("animationiteration"), Do = Pa("animationstart"), Sv = Pa("transitionrun"), bv = Pa("transitionstart"), Tv = Pa("transitioncancel"), Mo = Pa("transitionend"), xo = /* @__PURE__ */ new Map(), hc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  hc.push("scrollEnd");
  function Ct(l, t) {
    xo.set(l, t), ka(t, [l]);
  }
  var _v = 0;
  function ua(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = Rt.identifierPrefix;
    var a = _v++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function Co(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, a = We;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = l[a[e]];
        if (u != null) {
          if (u === "none") return "none";
          t = t == null ? u : t + (" " + u);
        }
      }
    return t ?? l.default;
  }
  function na(l, t) {
    return l = Co(l), t = Co(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
  }
  var An = typeof reportError == "function" ? reportError : function(l) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof l == "object" && l !== null && typeof l.message == "string" ? String(l.message) : String(l),
        error: l
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", l);
      return;
    }
    console.error(l);
  }, _t = [], je = 0, yc = 0;
  function Dn() {
    for (var l = je, t = yc = je = 0; t < l; ) {
      var a = _t[t];
      _t[t++] = null;
      var e = _t[t];
      _t[t++] = null;
      var u = _t[t];
      _t[t++] = null;
      var n = _t[t];
      if (_t[t++] = null, e !== null && u !== null) {
        var i = e.pending;
        i === null ? u.next = u : (u.next = i.next, i.next = u), e.pending = u;
      }
      n !== 0 && jo(a, u, n);
    }
  }
  function Mn(l, t, a, e) {
    _t[je++] = l, _t[je++] = t, _t[je++] = a, _t[je++] = e, yc |= e, l.lanes |= e, l = l.alternate, l !== null && (l.lanes |= e);
  }
  function gc(l, t, a, e) {
    return Mn(l, t, a, e), xn(l);
  }
  function le(l, t) {
    return Mn(l, null, null, t), xn(l);
  }
  function jo(l, t, a) {
    l.lanes |= a;
    var e = l.alternate;
    e !== null && (e.lanes |= a);
    for (var u = !1, n = l.return; n !== null; )
      n.childLanes |= a, e = n.alternate, e !== null && (e.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (u = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, u && t !== null && (u = 31 - st(a), l = n.hiddenUpdates, e = l[u], e === null ? l[u] = [t] : e.push(t), t.lane = a | 536870912), n) : null;
  }
  function xn(l) {
    if (50 < Ku)
      throw Ku = 0, Si = null, Error(h(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Ue = {};
  function Ev(l, t, a, e) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = e, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Pl(l, t, a, e) {
    return new Ev(l, t, a, e);
  }
  function Sc(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function ia(l, t) {
    var a = l.alternate;
    return a === null ? (a = Pl(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function Uo(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Cn(l, t, a, e, u, n) {
    var i = 0;
    if (e = l, typeof e == "function") Sc(e) && (i = 1);
    else if (typeof e == "string")
      i = Wh(
        l,
        a,
        Xt.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (e) {
        case xt:
          return l = Pl(31, a, t, u), l.elementType = xt, l.lanes = n, l;
        case bt:
          return te(a.children, u, n, t);
        case it:
          i = 8, u |= 24;
          break;
        case ya:
          return l = Pl(12, a, t, u | 2), l.elementType = ya, l.lanes = n, l;
        case Y:
          return l = Pl(13, a, t, u), l.elementType = Y, l.lanes = n, l;
        case G:
          return l = Pl(19, a, t, u), l.elementType = G, l.lanes = n, l;
        case Pt:
        case d:
          return l = u | 32, l = Pl(30, a, t, l), l.elementType = d, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case Ul:
                i = 10;
                break l;
              case wa:
                i = 9;
                break l;
              case A:
                i = 11;
                break l;
              case hl:
                i = 14;
                break l;
              case il:
                i = 16, e = null;
                break l;
            }
          i = 29, a = Error(
            h(130, l === null ? "null" : typeof l, "")
          ), e = null;
      }
    return t = Pl(i, a, t, u), t.elementType = l, t.type = e, t.lanes = n, t;
  }
  function te(l, t, a, e) {
    return l = Pl(7, l, e, t), l.lanes = a, l;
  }
  function bc(l, t, a) {
    return l = Pl(6, l, null, t), l.lanes = a, l;
  }
  function po(l) {
    var t = Pl(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Tc(l, t, a) {
    return t = Pl(
      4,
      l.children !== null ? l.children : [],
      l.key,
      t
    ), t.lanes = a, t.stateNode = {
      containerInfo: l.containerInfo,
      pendingChildren: null,
      implementation: l.implementation
    }, t;
  }
  var Ro = /* @__PURE__ */ new WeakMap();
  function Et(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Ro.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Ds(t)
      }, Ro.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Ds(t)
    };
  }
  var pe = [], Re = 0, jn = null, Nu = 0, zt = [], Nt = 0, Ea = null, Zt = 1, Vt = "";
  function ca(l, t) {
    pe[Re++] = Nu, pe[Re++] = jn, jn = l, Nu = t;
  }
  function Ho(l, t, a) {
    zt[Nt++] = Zt, zt[Nt++] = Vt, zt[Nt++] = Ea, Ea = l;
    var e = Zt;
    l = Vt;
    var u = 32 - st(e) - 1;
    e &= ~(1 << u), a += 1;
    var n = 32 - st(t) + u;
    if (30 < n) {
      var i = u - u % 5;
      n = (e & (1 << i) - 1).toString(32), e >>= i, u -= i, Zt = 1 << 32 - st(t) + u | a << u | e, Vt = n + l;
    } else
      Zt = 1 << n | a << u | e, Vt = l;
  }
  function Un(l) {
    l.return !== null && (ca(l, 1), Ho(l, 1, 0));
  }
  function _c(l) {
    for (; l === jn; )
      jn = pe[--Re], pe[Re] = null, Nu = pe[--Re], pe[Re] = null;
    for (; l === Ea; )
      Ea = zt[--Nt], zt[Nt] = null, Vt = zt[--Nt], zt[Nt] = null, Zt = zt[--Nt], zt[Nt] = null;
  }
  function Bo(l, t) {
    zt[Nt++] = Zt, zt[Nt++] = Vt, zt[Nt++] = Ea, Zt = t.id, Vt = t.overflow, Ea = l;
  }
  var Rl = null, bl = null, K = !1, za = null, Ot = !1, Ec = Error(h(519));
  function Na(l) {
    var t = Error(
      h(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Ou(Et(t, l)), Ec;
  }
  function qo(l) {
    var t = l.stateNode, a = l.type, e = l.memoizedProps;
    switch (t[Yl] = l, t[Il] = e, a) {
      case "dialog":
        $("cancel", t), $("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        $("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < wu.length; a++)
          $(wu[a], t);
        break;
      case "source":
        $("error", t);
        break;
      case "img":
      case "image":
      case "link":
        $("error", t), $("load", t);
        break;
      case "details":
        $("toggle", t);
        break;
      case "input":
        $("invalid", t), Fs(
          t,
          e.value,
          e.defaultValue,
          e.checked,
          e.defaultChecked,
          e.type,
          e.name,
          !0
        );
        break;
      case "select":
        $("invalid", t);
        break;
      case "textarea":
        $("invalid", t), Ws(t, e.value, e.defaultValue, e.children);
    }
    a = e.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || e.suppressHydrationWarning === !0 || u0(t.textContent, a) ? (e.popover != null && ($("beforetoggle", t), $("toggle", t)), e.onScroll != null && $("scroll", t), e.onScrollEnd != null && $("scrollend", t), e.onClick != null && (t.onclick = Qt), t = !0) : t = !1, t || Na(l, !0);
  }
  function pn(l) {
    for (Rl = l.return; Rl; )
      switch (Rl.tag) {
        case 5:
        case 31:
        case 13:
          Ot = !1;
          return;
        case 27:
        case 3:
          Ot = !0;
          return;
        default:
          Rl = Rl.return;
      }
  }
  function He(l) {
    if (l !== Rl) return !1;
    if (!K) return pn(l), K = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || Pf(l.type, l.memoizedProps)), a = !a), a && bl && Na(l), pn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      bl = z0(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      bl = z0(l);
    } else
      t === 27 ? (t = bl, Xa(l.type) ? (l = fs, fs = null, bl = l) : bl = t) : bl = Rl ? Dt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function ae() {
    bl = Rl = null, K = !1;
  }
  function zc() {
    var l = za;
    return l !== null && (at === null ? at = l : at.push.apply(
      at,
      l
    ), za = null), l;
  }
  function Ou(l) {
    za === null ? za = [l] : za.push(l);
  }
  var Nc = Gt(null), ee = null, fa = null;
  function Oa(l, t, a) {
    Sl(Nc, t._currentValue), t._currentValue = a;
  }
  function sa(l) {
    l._currentValue = Nc.current, ql(Nc);
  }
  function Rn(l, t, a) {
    for (; l !== null; ) {
      var e = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, e !== null && (e.childLanes |= t)) : e !== null && (e.childLanes & t) !== t && (e.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Oc(l, t, a, e) {
    var u = l.child;
    for (u !== null && (u.return = l); u !== null; ) {
      var n = u.dependencies;
      if (n !== null) {
        var i = u.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var c = n;
          n = u;
          for (var f = 0; f < t.length; f++)
            if (c.context === t[f]) {
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Rn(
                n.return,
                a,
                l
              ), e || (i = null);
              break l;
            }
          n = c.next;
        }
      } else if (u.tag === 18) {
        if (i = u.return, i === null) throw Error(h(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Rn(i, a, l), i = null;
      } else
        u.tag === 13 && u.memoizedState !== null && u.memoizedState.dehydrated === null ? (u.lanes |= a, i = u.alternate, i !== null && (i.lanes |= a), Rn(
          u.return,
          a,
          l
        ), i = u.child, i = i !== null ? i.sibling : null) : i = u.child;
      if (i !== null) i.return = u;
      else
        for (i = u; i !== null; ) {
          if (i === l) {
            i = null;
            break;
          }
          if (u = i.sibling, u !== null) {
            u.return = i.return, i = u;
            break;
          }
          i = i.return;
        }
      u = i;
    }
  }
  function ue(l, t, a, e) {
    l = null;
    for (var u = t, n = !1; u !== null; ) {
      if (!n) {
        if ((u.flags & 524288) !== 0) n = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var i = u.alternate;
        if (i === null) throw Error(h(387));
        if (i = i.memoizedProps, i !== null) {
          var c = u.type;
          dt(u.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (u === cn.current) {
        if (i = u.alternate, i === null) throw Error(h(387));
        i.memoizedState.memoizedState !== u.memoizedState.memoizedState && (l !== null ? l.push(iu) : l = [iu]);
      }
      u = u.return;
    }
    return l !== null && Oc(
      t,
      l,
      a,
      e
    ), t.flags |= 262144, l !== null;
  }
  function Hn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!dt(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function ne(l) {
    ee = l, fa = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Gl(l) {
    return Yo(ee, l);
  }
  function Bn(l, t) {
    return ee === null && ne(l), Yo(l, t);
  }
  function Yo(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, fa === null) {
      if (l === null) throw Error(h(308));
      fa = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else fa = fa.next = t;
    return a;
  }
  var zv = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, e) {
        l.push(e);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(a) {
        return a();
      });
    };
  }, Nv = b.unstable_scheduleCallback, Ov = b.unstable_NormalPriority, Dl = {
    $$typeof: Ul,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Ac() {
    return {
      controller: new zv(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Au(l) {
    l.refCount--, l.refCount === 0 && Nv(Ov, function() {
      l.controller.abort();
    });
  }
  function Go(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var e = t[l];
        a.indexOf(e) === -1 && a.push(e);
      }
    }
  }
  var Du = null;
  function Av(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Mu = null, Dc = 0, ie = 0, Be = null;
  function Dv(l, t) {
    if (Mu === null) {
      var a = Mu = [];
      Dc = 0, ie = Lf(), Be = {
        status: "pending",
        value: void 0,
        then: function(e) {
          a.push(e);
        }
      };
    }
    return Dc++, t.then(Xo, Xo), t;
  }
  function Xo() {
    if (--Dc === 0 && (Du = null, Mu !== null)) {
      Be !== null && (Be.status = "fulfilled");
      var l = Mu;
      Mu = null, ie = 0, Be = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Mv(l, t) {
    var a = [], e = {
      status: "pending",
      value: null,
      reason: null,
      then: function(u) {
        a.push(u);
      }
    };
    return l.then(
      function() {
        e.status = "fulfilled", e.value = t;
        for (var u = 0; u < a.length; u++) (0, a[u])(t);
      },
      function(u) {
        for (e.status = "rejected", e.reason = u, u = 0; u < a.length; u++)
          (0, a[u])(void 0);
      }
    ), e;
  }
  var Qo = j.S;
  j.S = function(l, t) {
    if (pr = ct(), typeof t == "object" && t !== null && typeof t.then == "function" && Dv(l, t), Du !== null)
      for (var a = lu; a !== null; )
        Go(a, Du), a = a.next;
    if (a = l.types, a !== null) {
      for (var e = lu; e !== null; )
        Go(e, a), e = e.next;
      if (ie !== 0) {
        e = Du, e === null && (e = Du = []);
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.indexOf(n) === -1 && e.push(n);
        }
      }
    }
    Qo !== null && Qo(l, t);
  };
  var ce = Gt(null);
  function Mc() {
    var l = ce.current;
    return l !== null ? l : yl.pooledCache;
  }
  function qn(l, t) {
    t === null ? Sl(ce, ce.current) : Sl(ce, t.pool);
  }
  function Zo() {
    var l = Mc();
    return l === null ? null : { parent: Dl._currentValue, pool: l };
  }
  var qe = Error(h(460)), xc = Error(h(474)), Yn = Error(h(542)), Gn = { then: function() {
  } };
  function Vo(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Lo(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Qt, Qt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Jo(l), l === void 0 && !("reason" in t) ? Error(h(600)) : l;
      default:
        if (typeof t.status == "string") t.then(Qt, Qt);
        else {
          if (l = yl, l !== null && 100 < l.shellSuspendCounter)
            throw Error(h(482));
          l = t, l.status = "pending", l.then(
            function(e) {
              if (t.status === "pending") {
                var u = t;
                u.status = "fulfilled", u.value = e;
              }
            },
            function(e) {
              if (t.status === "pending") {
                var u = t;
                u.status = "rejected", u.reason = e;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw l = t.reason, Jo(l), l;
        }
        throw se = t, qe;
    }
  }
  function fe(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (se = a, qe) : a;
    }
  }
  var se = null;
  function Ko() {
    if (se === null) throw Error(h(459));
    var l = se;
    return se = null, l;
  }
  function Jo(l) {
    if (l === qe || l === Yn)
      throw Error(h(483));
  }
  var Ye = null, xu = 0;
  function Xn(l) {
    var t = xu;
    return xu += 1, Ye === null && (Ye = []), Lo(Ye, l, t);
  }
  function Aa(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Qn(l, t) {
    throw t.$$typeof === el ? Error(h(525)) : (l = Object.prototype.toString.call(t), Error(
      h(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function wo(l) {
    function t(m, s) {
      if (l) {
        var y = m.deletions;
        y === null ? (m.deletions = [s], m.flags |= 16) : y.push(s);
      }
    }
    function a(m, s) {
      if (!l) return null;
      for (; s !== null; )
        t(m, s), s = s.sibling;
      return null;
    }
    function e(m) {
      for (var s = /* @__PURE__ */ new Map(); m !== null; )
        m.key === null ? s.set(m.index, m) : s.set(m.key, m), m = m.sibling;
      return s;
    }
    function u(m, s) {
      return m = ia(m, s), m.index = 0, m.sibling = null, m;
    }
    function n(m, s, y) {
      return m.index = y, l ? (y = m.alternate, y !== null ? (y = y.index, y < s ? (m.flags |= 2, s) : y) : (m.flags |= 134217730, s)) : (m.flags |= 1048576, s);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, s, y, _) {
      return s === null || s.tag !== 6 ? (s = bc(y, m.mode, _), s.return = m, s) : (s = u(s, y), s.return = m, s);
    }
    function f(m, s, y, _) {
      var x = y.type;
      return x === bt ? (m = S(
        m,
        s,
        y.props.children,
        _,
        y.key
      ), Aa(m, y), m) : s !== null && (s.elementType === x || typeof x == "object" && x !== null && x.$$typeof === il && fe(x) === s.type) ? (s = u(s, y.props), Aa(s, y), s.return = m, s) : (s = Cn(
        y.type,
        y.key,
        y.props,
        null,
        m.mode,
        _
      ), Aa(s, y), s.return = m, s);
    }
    function v(m, s, y, _) {
      return s === null || s.tag !== 4 || s.stateNode.containerInfo !== y.containerInfo || s.stateNode.implementation !== y.implementation ? (s = Tc(y, m.mode, _), s.return = m, s) : (s = u(s, y.children || []), s.return = m, s);
    }
    function S(m, s, y, _, x) {
      return s === null || s.tag !== 7 ? (s = te(
        y,
        m.mode,
        _,
        x
      ), s.return = m, s) : (s = u(s, y), s.return = m, s);
    }
    function E(m, s, y) {
      if (typeof s == "string" && s !== "" || typeof s == "number" || typeof s == "bigint")
        return s = bc(
          "" + s,
          m.mode,
          y
        ), s.return = m, s;
      if (typeof s == "object" && s !== null) {
        switch (s.$$typeof) {
          case Yt:
            return y = Cn(
              s.type,
              s.key,
              s.props,
              null,
              m.mode,
              y
            ), Aa(y, s), y.return = m, y;
          case St:
            return s = Tc(
              s,
              m.mode,
              y
            ), s.return = m, s;
          case il:
            return s = fe(s), E(m, s, y);
        }
        if (ul(s) || R(s))
          return s = te(
            s,
            m.mode,
            y,
            null
          ), s.return = m, s;
        if (typeof s.then == "function")
          return E(m, Xn(s), y);
        if (s.$$typeof === Ul)
          return E(
            m,
            Bn(m, s),
            y
          );
        Qn(m, s);
      }
      return null;
    }
    function r(m, s, y, _) {
      var x = s !== null ? s.key : null;
      if (typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint")
        return x !== null ? null : c(m, s, "" + y, _);
      if (typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case Yt:
            return y.key === x ? f(m, s, y, _) : null;
          case St:
            return y.key === x ? v(m, s, y, _) : null;
          case il:
            return y = fe(y), r(m, s, y, _);
        }
        if (ul(y) || R(y))
          return x !== null ? null : S(m, s, y, _, null);
        if (typeof y.then == "function")
          return r(
            m,
            s,
            Xn(y),
            _
          );
        if (y.$$typeof === Ul)
          return r(
            m,
            s,
            Bn(m, y),
            _
          );
        Qn(m, y);
      }
      return null;
    }
    function g(m, s, y, _, x) {
      if (typeof _ == "string" && _ !== "" || typeof _ == "number" || typeof _ == "bigint")
        return m = m.get(y) || null, c(s, m, "" + _, x);
      if (typeof _ == "object" && _ !== null) {
        switch (_.$$typeof) {
          case Yt:
            return m = m.get(
              _.key === null ? y : _.key
            ) || null, f(s, m, _, x);
          case St:
            return m = m.get(
              _.key === null ? y : _.key
            ) || null, v(s, m, _, x);
          case il:
            return _ = fe(_), g(
              m,
              s,
              y,
              _,
              x
            );
        }
        if (ul(_) || R(_))
          return m = m.get(y) || null, S(s, m, _, x, null);
        if (typeof _.then == "function")
          return g(
            m,
            s,
            y,
            Xn(_),
            x
          );
        if (_.$$typeof === Ul)
          return g(
            m,
            s,
            y,
            Bn(s, _),
            x
          );
        Qn(s, _);
      }
      return null;
    }
    function O(m, s, y, _) {
      for (var x = null, k = null, U = s, q = s = 0, Cl = null; U !== null && q < y.length; q++) {
        U.index > q ? (Cl = U, U = null) : Cl = U.sibling;
        var P = r(
          m,
          U,
          y[q],
          _
        );
        if (P === null) {
          U === null && (U = Cl);
          break;
        }
        l && U && P.alternate === null && t(m, U), s = n(P, s, q), k === null ? x = P : k.sibling = P, k = P, U = Cl;
      }
      if (q === y.length)
        return a(m, U), K && ca(m, q), x;
      if (U === null) {
        for (; q < y.length; q++)
          U = E(m, y[q], _), U !== null && (s = n(
            U,
            s,
            q
          ), k === null ? x = U : k.sibling = U, k = U);
        return K && ca(m, q), x;
      }
      for (U = e(U); q < y.length; q++)
        Cl = g(
          U,
          m,
          q,
          y[q],
          _
        ), Cl !== null && (l && (P = Cl.alternate, P !== null && U.delete(P.key === null ? q : P.key)), s = n(
          Cl,
          s,
          q
        ), k === null ? x = Cl : k.sibling = Cl, k = Cl);
      return l && U.forEach(function(Ka) {
        return t(m, Ka);
      }), K && ca(m, q), x;
    }
    function C(m, s, y, _) {
      if (y == null) throw Error(h(151));
      for (var x = null, k = null, U = s, q = s = 0, Cl = null, P = y.next(); U !== null && !P.done; q++, P = y.next()) {
        U.index > q ? (Cl = U, U = null) : Cl = U.sibling;
        var Ka = r(m, U, P.value, _);
        if (Ka === null) {
          U === null && (U = Cl);
          break;
        }
        l && U && Ka.alternate === null && t(m, U), s = n(Ka, s, q), k === null ? x = Ka : k.sibling = Ka, k = Ka, U = Cl;
      }
      if (P.done)
        return a(m, U), K && ca(m, q), x;
      if (U === null) {
        for (; !P.done; q++, P = y.next())
          P = E(m, P.value, _), P !== null && (s = n(P, s, q), k === null ? x = P : k.sibling = P, k = P);
        return K && ca(m, q), x;
      }
      for (U = e(U); !P.done; q++, P = y.next())
        P = g(U, m, q, P.value, _), P !== null && (l && (Cl = P.alternate, Cl !== null && U.delete(
          Cl.key === null ? q : Cl.key
        )), s = n(P, s, q), k === null ? x = P : k.sibling = P, k = P);
      return l && U.forEach(function(fy) {
        return t(m, fy);
      }), K && ca(m, q), x;
    }
    function L(m, s, y, _) {
      if (typeof y == "object" && y !== null && y.type === bt && y.key === null && y.props.ref === void 0 && (y = y.props.children), typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case Yt:
            l: {
              for (var x = y.key; s !== null; ) {
                if (s.key === x) {
                  if (x = y.type, x === bt) {
                    if (s.tag === 7) {
                      a(
                        m,
                        s.sibling
                      ), _ = u(
                        s,
                        y.props.children
                      ), Aa(_, y), _.return = m, m = _;
                      break l;
                    }
                  } else if (s.elementType === x || typeof x == "object" && x !== null && x.$$typeof === il && fe(x) === s.type) {
                    a(
                      m,
                      s.sibling
                    ), _ = u(s, y.props), Aa(_, y), _.return = m, m = _;
                    break l;
                  }
                  a(m, s);
                  break;
                } else t(m, s);
                s = s.sibling;
              }
              y.type === bt ? (_ = te(
                y.props.children,
                m.mode,
                _,
                y.key
              ), Aa(_, y), _.return = m, m = _) : (_ = Cn(
                y.type,
                y.key,
                y.props,
                null,
                m.mode,
                _
              ), Aa(_, y), _.return = m, m = _);
            }
            return i(m);
          case St:
            l: {
              for (x = y.key; s !== null; ) {
                if (s.key === x)
                  if (s.tag === 4 && s.stateNode.containerInfo === y.containerInfo && s.stateNode.implementation === y.implementation) {
                    a(
                      m,
                      s.sibling
                    ), _ = u(s, y.children || []), _.return = m, m = _;
                    break l;
                  } else {
                    a(m, s);
                    break;
                  }
                else t(m, s);
                s = s.sibling;
              }
              _ = Tc(y, m.mode, _), _.return = m, m = _;
            }
            return i(m);
          case il:
            return y = fe(y), L(
              m,
              s,
              y,
              _
            );
        }
        if (ul(y))
          return O(
            m,
            s,
            y,
            _
          );
        if (R(y)) {
          if (x = R(y), typeof x != "function") throw Error(h(150));
          return y = x.call(y), C(
            m,
            s,
            y,
            _
          );
        }
        if (typeof y.then == "function")
          return L(
            m,
            s,
            Xn(y),
            _
          );
        if (y.$$typeof === Ul)
          return L(
            m,
            s,
            Bn(m, y),
            _
          );
        Qn(m, y);
      }
      return typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint" ? (y = "" + y, s !== null && s.tag === 6 ? (a(m, s.sibling), _ = u(s, y), _.return = m, m = _) : (a(m, s), _ = bc(y, m.mode, _), _.return = m, m = _), i(m)) : a(m, s);
    }
    return function(m, s, y, _) {
      try {
        xu = 0;
        var x = L(
          m,
          s,
          y,
          _
        );
        return Ye = null, x;
      } catch (U) {
        if (U === qe || U === Yn) throw U;
        var k = Pl(29, U, null, m.mode);
        return k.lanes = _, k.return = m, k;
      } finally {
      }
    };
  }
  var oe = wo(!0), Fo = wo(!1), Da = !1;
  function Cc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function jc(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Ma(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function xa(l, t, a) {
    var e = l.updateQueue;
    if (e === null) return null;
    if (e = e.shared, (nl & 2) !== 0) {
      var u = e.pending;
      return u === null ? t.next = t : (t.next = u.next, u.next = t), e.pending = t, t = xn(l), jo(l, null, a), t;
    }
    return Mn(l, e, t, a), xn(l);
  }
  function Cu(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var e = t.lanes;
      e &= l.pendingLanes, a |= e, t.lanes = a, Rs(l, a);
    }
  }
  function Uc(l, t) {
    var a = l.updateQueue, e = l.alternate;
    if (e !== null && (e = e.updateQueue, a === e)) {
      var u = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var i = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? u = n = i : n = n.next = i, a = a.next;
        } while (a !== null);
        n === null ? u = n = t : n = n.next = t;
      } else u = n = t;
      a = {
        baseState: e.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: n,
        shared: e.shared,
        callbacks: e.callbacks
      }, l.updateQueue = a;
      return;
    }
    l = a.lastBaseUpdate, l === null ? a.firstBaseUpdate = t : l.next = t, a.lastBaseUpdate = t;
  }
  var pc = !1;
  function ju() {
    if (pc) {
      var l = Be;
      if (l !== null) throw l;
    }
  }
  function Uu(l, t, a, e) {
    pc = !1;
    var u = l.updateQueue;
    Da = !1;
    var n = u.firstBaseUpdate, i = u.lastBaseUpdate, c = u.shared.pending;
    if (c !== null) {
      u.shared.pending = null;
      var f = c, v = f.next;
      f.next = null, i === null ? n = v : i.next = v, i = f;
      var S = l.alternate;
      S !== null && (S = S.updateQueue, c = S.lastBaseUpdate, c !== i && (c === null ? S.firstBaseUpdate = v : c.next = v, S.lastBaseUpdate = f));
    }
    if (n !== null) {
      var E = u.baseState;
      i = 0, S = v = f = null, c = n;
      do {
        var r = c.lane & -536870913, g = r !== c.lane;
        if (g ? (W & r) === r : (e & r) === r) {
          r !== 0 && r === ie && (pc = !0), S !== null && (S = S.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var O = l, C = c;
            r = t;
            var L = a;
            switch (C.tag) {
              case 1:
                if (O = C.payload, typeof O == "function") {
                  E = O.call(L, E, r);
                  break l;
                }
                E = O;
                break l;
              case 3:
                O.flags = O.flags & -65537 | 128;
              case 0:
                if (O = C.payload, r = typeof O == "function" ? O.call(L, E, r) : O, r == null) break l;
                E = w({}, E, r);
                break l;
              case 2:
                Da = !0;
            }
          }
          r = c.callback, r !== null && (l.flags |= 64, g && (l.flags |= 8192), g = u.callbacks, g === null ? u.callbacks = [r] : g.push(r));
        } else
          g = {
            lane: r,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, S === null ? (v = S = g, f = E) : S = S.next = g, i |= r;
        if (c = c.next, c === null) {
          if (c = u.shared.pending, c === null)
            break;
          g = c, c = g.next, g.next = null, u.lastBaseUpdate = g, u.shared.pending = null;
        }
      } while (!0);
      S === null && (f = E), u.baseState = f, u.firstBaseUpdate = v, u.lastBaseUpdate = S, n === null && (u.shared.lanes = 0), Ba |= i, l.lanes = i, l.memoizedState = E;
    }
  }
  function $o(l, t) {
    if (typeof l != "function")
      throw Error(h(191, l));
    l.call(t);
  }
  function Wo(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        $o(a[l], t);
  }
  var Ca = Gt(null), Zn = Gt(0);
  function ko(l, t) {
    l = va, Sl(Zn, l), Sl(Ca, t), va = l | t.baseLanes;
  }
  function Rc() {
    Sl(Zn, va), Sl(Ca, Ca.current);
  }
  function Hc() {
    va = Zn.current, ql(Ca), ql(Zn);
  }
  var Xl = Gt(null), wl = null;
  function ja(l) {
    var t = l.alternate;
    Sl(Ql, Ql.current & 1), Sl(Xl, l), wl === null && (t === null || Ca.current !== null || t.memoizedState !== null) && (wl = l);
  }
  function Bc(l) {
    Sl(Ql, Ql.current), Sl(Xl, l), wl === null && (wl = l);
  }
  function Io(l) {
    l.tag === 22 ? (Sl(Ql, Ql.current), Sl(Xl, l), wl === null && (wl = l)) : Ua();
  }
  function Ua() {
    Sl(Ql, Ql.current), Sl(Xl, Xl.current);
  }
  function rt(l) {
    ql(Xl), wl === l && (wl = null), ql(Ql);
  }
  var Ql = Gt(0);
  function pu(l, t) {
    Sl(Xl, Xl.current), Sl(Ql, t);
  }
  function qc(l) {
    ql(Ql), ql(Xl), wl === l && (wl = null);
  }
  function Vn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || is(a) || cs(a)))
          return t;
      } else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === l) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === l) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var oa = 0, V = null, ml = null, Ml = null, Ln = !1, Ge = !1, de = !1, Kn = 0, Ru = 0, Xe = null, xv = 0;
  function Nl() {
    throw Error(h(321));
  }
  function Yc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!dt(l[a], t[a])) return !1;
    return !0;
  }
  function Gc(l, t, a, e, u, n) {
    return oa = n, V = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, j.H = l === null || l.memoizedState === null ? Hd : Bd, de = !1, n = a(e, u), de = !1, Ge && (n = ld(
      t,
      a,
      e,
      u
    )), Po(l), n;
  }
  function Po(l) {
    j.H = In;
    var t = ml !== null && ml.next !== null;
    if (oa = 0, Ml = ml = V = null, Ln = !1, Ru = 0, Xe = null, t) throw Error(h(300));
    l === null || xl || (l = l.dependencies, l !== null && Hn(l) && (xl = !0));
  }
  function ld(l, t, a, e) {
    V = l;
    var u = 0;
    do {
      if (Ge && (Xe = null), Ru = 0, Ge = !1, 25 <= u) throw Error(h(301));
      if (u += 1, Ml = ml = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      j.H = qv, n = t(a, e);
    } while (Ge);
    return n;
  }
  function Cv() {
    var l = j.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Hu(t) : t, l = l.useState()[0], (ml !== null ? ml.memoizedState : null) !== l && (V.flags |= 1024), t;
  }
  function Xc() {
    var l = Kn !== 0;
    return Kn = 0, l;
  }
  function Qc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Zc(l) {
    if (Ln) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      Ln = !1;
    }
    oa = 0, Ml = ml = V = null, Ge = !1, Ru = Kn = 0, Xe = null;
  }
  function $l() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Ml === null ? V.memoizedState = Ml = l : Ml = Ml.next = l, Ml;
  }
  function Al() {
    if (ml === null) {
      var l = V.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = ml.next;
    var t = Ml === null ? V.memoizedState : Ml.next;
    if (t !== null)
      Ml = t, ml = l;
    else {
      if (l === null)
        throw V.alternate === null ? Error(h(467)) : Error(h(310));
      ml = l, l = {
        memoizedState: ml.memoizedState,
        baseState: ml.baseState,
        baseQueue: ml.baseQueue,
        queue: ml.queue,
        next: null
      }, Ml === null ? V.memoizedState = Ml = l : Ml = Ml.next = l;
    }
    return Ml;
  }
  function Jn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Hu(l) {
    var t = Ru;
    return Ru += 1, Xe === null && (Xe = []), l = Lo(Xe, l, t), t = V, (Ml === null ? t.memoizedState : Ml.next) === null && (t = t.alternate, j.H = t === null || t.memoizedState === null ? Hd : Bd), l;
  }
  function wn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Hu(l);
      if (l.$$typeof === z) return;
      if (l.$$typeof === Ul) return Gl(l);
    }
    throw Error(h(438, String(l)));
  }
  function Vc(l) {
    var t = null, a = V.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var e = V.alternate;
      e !== null && (e = e.updateQueue, e !== null && (e = e.memoCache, e != null && (t = {
        data: e.data.map(function(u) {
          return u.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Jn(), V.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), e = 0; e < l; e++)
        a[e] = Fa;
    return t.index++, a;
  }
  function da(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function Fn(l) {
    var t = Al();
    return Lc(t, ml, l);
  }
  function Lc(l, t, a) {
    var e = l.queue;
    if (e === null) throw Error(h(311));
    e.lastRenderedReducer = a;
    var u = l.baseQueue, n = e.pending;
    if (n !== null) {
      if (u !== null) {
        var i = u.next;
        u.next = n.next, n.next = i;
      }
      t.baseQueue = u = n, e.pending = null;
    }
    if (n = l.baseState, u === null) l.memoizedState = n;
    else {
      t = u.next;
      var c = i = null, f = null, v = t, S = !1;
      do {
        var E = v.lane & -536870913;
        if (E !== v.lane ? (W & E) === E : (oa & E) === E) {
          var r = v.revertLane;
          if (r === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }), E === ie && (S = !0);
          else if ((oa & r) === r) {
            v = v.next, r === ie && (S = !0);
            continue;
          } else
            E = {
              lane: 0,
              revertLane: v.revertLane,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }, f === null ? (c = f = E, i = n) : f = f.next = E, V.lanes |= r, Ba |= r;
          E = v.action, de && a(n, E), n = v.hasEagerState ? v.eagerState : a(n, E);
        } else
          r = {
            lane: E,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = r, i = n) : f = f.next = r, V.lanes |= E, Ba |= E;
        v = v.next;
      } while (v !== null && v !== t);
      if (f === null ? i = n : f.next = c, !dt(n, l.memoizedState) && (xl = !0, S && (a = Be, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, e.lastRenderedState = n;
    }
    return u === null && (e.lanes = 0), [l.memoizedState, e.dispatch];
  }
  function Kc(l) {
    var t = Al(), a = t.queue;
    if (a === null) throw Error(h(311));
    a.lastRenderedReducer = l;
    var e = a.dispatch, u = a.pending, n = t.memoizedState;
    if (u !== null) {
      a.pending = null;
      var i = u = u.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== u);
      dt(n, t.memoizedState) || (xl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, e];
  }
  function td(l, t, a) {
    var e = V, u = Al(), n = K;
    if (n) {
      if (a === void 0) throw Error(h(407));
      a = a();
    } else a = t();
    var i = !dt(
      (ml || u).memoizedState,
      a
    );
    if (i && (u.memoizedState = a, xl = !0), u = u.queue, Fc(ud.bind(null, e, u, l), [
      l
    ]), l = u.getSnapshot !== t || i || Ml !== null && (Ml.memoizedState.tag & 1) !== 0, Qe(
      l ? 9 : 8,
      { destroy: void 0 },
      ed.bind(null, e, u, a, t),
      null
    ), l) {
      if (e.flags |= 2048, yl === null) throw Error(h(349));
      n || (oa & 127) !== 0 || ad(e, t, a);
    }
    return a;
  }
  function ad(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = V.updateQueue, t === null ? (t = Jn(), V.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function ed(l, t, a, e) {
    t.value = a, t.getSnapshot = e, nd(t) && id(l);
  }
  function ud(l, t, a) {
    return a(function() {
      nd(t) && id(l);
    });
  }
  function nd(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !dt(l, a);
    } catch {
      return !0;
    }
  }
  function id(l) {
    var t = le(l, 2);
    t !== null && et(t, l, 2);
  }
  function Jc(l) {
    var t = $l();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), de) {
        ba(!0);
        try {
          a();
        } finally {
          ba(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: da,
      lastRenderedState: l
    }, t;
  }
  function cd(l, t, a, e) {
    return l.baseState = a, Lc(
      l,
      ml,
      typeof e == "function" ? e : da
    );
  }
  function jv(l, t, a, e, u) {
    if (kn(l)) throw Error(h(485));
    if (l = t.action, l !== null) {
      var n = {
        payload: u,
        action: l,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(i) {
          n.listeners.push(i);
        }
      };
      j.T !== null ? a(!0) : n.isTransition = !1, e(n), a = t.pending, a === null ? (n.next = t.pending = n, fd(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function fd(l, t) {
    var a = t.action, e = t.payload, u = l.state;
    if (t.isTransition) {
      var n = j.T, i = {};
      i.types = n !== null ? n.types : null, j.T = i;
      try {
        var c = a(u, e), f = j.S;
        f !== null && f(i, c), sd(l, t, c);
      } catch (v) {
        wc(l, t, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), j.T = n;
      }
    } else
      try {
        n = a(u, e), sd(l, t, n);
      } catch (v) {
        wc(l, t, v);
      }
  }
  function sd(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(e) {
        od(l, t, e);
      },
      function(e) {
        return wc(l, t, e);
      }
    ) : od(l, t, a);
  }
  function od(l, t, a) {
    t.status = "fulfilled", t.value = a, dd(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, fd(l, a)));
  }
  function wc(l, t, a) {
    var e = l.pending;
    if (l.pending = null, e !== null) {
      e = e.next;
      do
        t.status = "rejected", t.reason = a, dd(t), t = t.next;
      while (t !== e);
    }
    l.action = null;
  }
  function dd(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function rd(l, t) {
    return t;
  }
  function md(l, t) {
    if (K) {
      var a = yl.formState;
      if (a !== null) {
        l: {
          var e = V;
          if (K) {
            if (bl) {
              t: {
                for (var u = bl, n = Ot; u.nodeType !== 8; ) {
                  if (!n) {
                    u = null;
                    break t;
                  }
                  if (u = Dt(
                    u.nextSibling
                  ), u === null) {
                    u = null;
                    break t;
                  }
                }
                n = u.data, u = n === "F!" || n === "F" ? u : null;
              }
              if (u) {
                bl = Dt(
                  u.nextSibling
                ), e = u.data === "F!";
                break l;
              }
            }
            Na(e);
          }
          e = !1;
        }
        e && (t = a[0]);
      }
    }
    return a = $l(), a.memoizedState = a.baseState = t, e = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: rd,
      lastRenderedState: t
    }, a.queue = e, a = Ud.bind(
      null,
      V,
      e
    ), e.dispatch = a, e = Jc(!1), n = Pc.bind(
      null,
      V,
      !1,
      e.queue
    ), e = $l(), u = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, e.queue = u, a = jv.bind(
      null,
      V,
      u,
      n,
      a
    ), u.dispatch = a, e.memoizedState = l, [t, a, !1];
  }
  function vd(l) {
    var t = Al();
    return hd(t, ml, l);
  }
  function hd(l, t, a) {
    if (t = Lc(
      l,
      t,
      rd
    )[0], l = Fn(da)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var e = Hu(t);
      } catch (i) {
        throw i === qe ? Yn : i;
      }
    else e = t;
    t = Al();
    var u = t.queue, n = u.dispatch;
    return a !== t.memoizedState && (V.flags |= 2048, Qe(
      9,
      { destroy: void 0 },
      Uv.bind(null, u, a),
      null
    )), [e, n, l];
  }
  function Uv(l, t) {
    l.action = t;
  }
  function yd(l) {
    var t = Al(), a = ml;
    if (a !== null)
      return hd(t, a, l);
    Al(), t = t.memoizedState, a = Al();
    var e = a.queue.dispatch;
    return a.memoizedState = l, [t, e, !1];
  }
  function Qe(l, t, a, e) {
    return l = { tag: l, create: a, deps: e, inst: t, next: null }, t = V.updateQueue, t === null && (t = Jn(), V.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (e = a.next, a.next = l, l.next = e, t.lastEffect = l), l;
  }
  function gd() {
    return Al().memoizedState;
  }
  function $n(l, t, a, e) {
    var u = $l();
    V.flags |= l, u.memoizedState = Qe(
      1 | t,
      { destroy: void 0 },
      a,
      e === void 0 ? null : e
    );
  }
  function Wn(l, t, a, e) {
    var u = Al();
    e = e === void 0 ? null : e;
    var n = u.memoizedState.inst;
    ml !== null && e !== null && Yc(e, ml.memoizedState.deps) ? u.memoizedState = Qe(t, n, a, e) : (V.flags |= l, u.memoizedState = Qe(
      1 | t,
      n,
      a,
      e
    ));
  }
  function Sd(l, t) {
    $n(8390656, 8, l, t);
  }
  function Fc(l, t) {
    Wn(2048, 8, l, t);
  }
  function pv(l) {
    V.flags |= 4;
    var t = V.updateQueue;
    if (t === null)
      t = Jn(), V.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function bd(l) {
    var t = Al().memoizedState;
    return pv({ ref: t, nextImpl: l }), function() {
      if ((nl & 2) !== 0) throw Error(h(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Td(l, t) {
    return Wn(4, 2, l, t);
  }
  function _d(l, t) {
    return Wn(4, 4, l, t);
  }
  function Ed(l, t) {
    if (typeof t == "function") {
      l = l();
      var a = t(l);
      return function() {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return l = l(), t.current = l, function() {
        t.current = null;
      };
  }
  function zd(l, t, a) {
    a = a != null ? a.concat([l]) : null, Wn(4, 4, Ed.bind(null, t, l), a);
  }
  function $c() {
  }
  function Nd(l, t) {
    var a = Al();
    t = t === void 0 ? null : t;
    var e = a.memoizedState;
    return t !== null && Yc(t, e[1]) ? e[0] : (a.memoizedState = [l, t], l);
  }
  function Od(l, t) {
    var a = Al();
    t = t === void 0 ? null : t;
    var e = a.memoizedState;
    if (t !== null && Yc(t, e[1]))
      return e[0];
    if (e = l(), de) {
      ba(!0);
      try {
        l();
      } finally {
        ba(!1);
      }
    }
    return a.memoizedState = [e, t], e;
  }
  function Wc(l, t, a) {
    return a === void 0 || (oa & 1073741824) !== 0 && (W & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Hr(), V.lanes |= l, Ba |= l, a);
  }
  function Ad(l, t, a, e) {
    return dt(a, t) ? a : Ca.current !== null ? (l = Wc(l, a, e), dt(l, t) || (xl = !0), l) : (oa & 106) === 0 || (oa & 1073741824) !== 0 && (W & 261930) === 0 ? (xl = !0, l.memoizedState = a) : (l = Hr(), V.lanes |= l, Ba |= l, t);
  }
  function Dd(l, t, a, e, u) {
    var n = X.p;
    X.p = n !== 0 && 8 > n ? n : 8;
    var i = j.T, c = {};
    c.types = i !== null ? i.types : null, j.T = c, Pc(l, !1, t, a);
    try {
      var f = u(), v = j.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var S = Mv(
          f,
          e
        );
        Bu(
          l,
          t,
          S,
          yt(l)
        );
      } else
        Bu(
          l,
          t,
          e,
          yt(l)
        );
    } catch (E) {
      Bu(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: E },
        yt()
      );
    } finally {
      X.p = n, i !== null && c.types !== null && (i.types = c.types), j.T = i;
    }
  }
  function Rv() {
  }
  function kc(l, t, a, e) {
    if (l.tag !== 5) throw Error(h(476));
    var u = Md(l).queue;
    Dd(
      l,
      u,
      t,
      la,
      a === null ? Rv : function() {
        return xd(l), a(e);
      }
    );
  }
  function Md(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: la,
      baseState: la,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: da,
        lastRenderedState: la
      },
      next: null
    };
    var a = {};
    return t.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: da,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function xd(l) {
    var t = Md(l);
    t.next === null && (t = l.alternate.memoizedState), Bu(
      l,
      t.next.queue,
      {},
      yt()
    );
  }
  function Ic() {
    return Gl(iu);
  }
  function Cd() {
    return Al().memoizedState;
  }
  function jd() {
    return Al().memoizedState;
  }
  function Hv(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = yt();
          l = Ma(a);
          var e = xa(t, l, a);
          e !== null && (et(e, t, a), Cu(e, t, a)), t = { cache: Ac() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Bv(l, t, a) {
    var e = yt();
    a = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, kn(l) ? pd(t, a) : (a = gc(l, t, a, e), a !== null && (et(a, l, e), Rd(a, t, e)));
  }
  function Ud(l, t, a) {
    var e = yt();
    Bu(l, t, a, e);
  }
  function Bu(l, t, a, e) {
    var u = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (kn(l)) pd(t, u);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (u.hasEagerState = !0, u.eagerState = c, dt(c, i))
            return Mn(l, t, u, 0), yl === null && Dn(), !1;
        } catch {
        } finally {
        }
      if (a = gc(l, t, u, e), a !== null)
        return et(a, l, e), Rd(a, t, e), !0;
    }
    return !1;
  }
  function Pc(l, t, a, e) {
    if (e = {
      lane: 2,
      revertLane: Lf(),
      gesture: null,
      action: e,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, kn(l)) {
      if (t) throw Error(h(479));
    } else
      t = gc(
        l,
        a,
        e,
        2
      ), t !== null && et(t, l, 2);
  }
  function kn(l) {
    var t = l.alternate;
    return l === V || t !== null && t === V;
  }
  function pd(l, t) {
    Ge = Ln = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function Rd(l, t, a) {
    if ((a & 4194048) !== 0) {
      var e = t.lanes;
      e &= l.pendingLanes, a |= e, t.lanes = a, Rs(l, a);
    }
  }
  var In = {
    readContext: Gl,
    use: wn,
    useCallback: Nl,
    useContext: Nl,
    useEffect: Nl,
    useImperativeHandle: Nl,
    useLayoutEffect: Nl,
    useInsertionEffect: Nl,
    useMemo: Nl,
    useReducer: Nl,
    useRef: Nl,
    useState: Nl,
    useDebugValue: Nl,
    useDeferredValue: Nl,
    useTransition: Nl,
    useSyncExternalStore: Nl,
    useId: Nl,
    useHostTransitionStatus: Nl,
    useFormState: Nl,
    useActionState: Nl,
    useOptimistic: Nl,
    useMemoCache: Nl,
    useCacheRefresh: Nl,
    useEffectEvent: Nl
  }, Hd = {
    readContext: Gl,
    use: wn,
    useCallback: function(l, t) {
      return $l().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Gl,
    useEffect: Sd,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, $n(
        4194308,
        4,
        Ed.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return $n(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      $n(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = $l();
      t = t === void 0 ? null : t;
      var e = l();
      if (de) {
        ba(!0);
        try {
          l();
        } finally {
          ba(!1);
        }
      }
      return a.memoizedState = [e, t], e;
    },
    useReducer: function(l, t, a) {
      var e = $l();
      if (a !== void 0) {
        var u = a(t);
        if (de) {
          ba(!0);
          try {
            a(t);
          } finally {
            ba(!1);
          }
        }
      } else u = t;
      return e.memoizedState = e.baseState = u, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: u
      }, e.queue = l, l = l.dispatch = Bv.bind(
        null,
        V,
        l
      ), [e.memoizedState, l];
    },
    useRef: function(l) {
      var t = $l();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Jc(l);
      var t = l.queue, a = Ud.bind(null, V, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = $l();
      return Wc(a, l, t);
    },
    useTransition: function() {
      var l = Jc(!1);
      return l = Dd.bind(
        null,
        V,
        l.queue,
        !0,
        !1
      ), $l().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var e = V, u = $l();
      if (K) {
        if (a === void 0)
          throw Error(h(407));
        a = a();
      } else {
        if (a = t(), yl === null)
          throw Error(h(349));
        (W & 127) !== 0 || ad(e, t, a);
      }
      u.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return u.queue = n, Sd(ud.bind(null, e, n, l), [
        l
      ]), e.flags |= 2048, Qe(
        9,
        { destroy: void 0 },
        ed.bind(
          null,
          e,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var l = $l(), t = yl.identifierPrefix;
      if (K) {
        var a = Vt, e = Zt;
        a = (e & ~(1 << 32 - st(e) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Kn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = xv++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: Ic,
    useFormState: md,
    useActionState: md,
    useOptimistic: function(l) {
      var t = $l();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = Pc.bind(
        null,
        V,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Vc,
    useCacheRefresh: function() {
      return $l().memoizedState = Hv.bind(
        null,
        V
      );
    },
    useEffectEvent: function(l) {
      var t = $l(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((nl & 2) !== 0)
          throw Error(h(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, Bd = {
    readContext: Gl,
    use: wn,
    useCallback: Nd,
    useContext: Gl,
    useEffect: Fc,
    useImperativeHandle: zd,
    useInsertionEffect: Td,
    useLayoutEffect: _d,
    useMemo: Od,
    useReducer: Fn,
    useRef: gd,
    useState: function() {
      return Fn(da);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = Al();
      return Ad(
        a,
        ml.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Fn(da)[0], t = Al().memoizedState;
      return [
        typeof l == "boolean" ? l : Hu(l),
        t
      ];
    },
    useSyncExternalStore: td,
    useId: Cd,
    useHostTransitionStatus: Ic,
    useFormState: vd,
    useActionState: vd,
    useOptimistic: function(l, t) {
      var a = Al();
      return cd(a, ml, l, t);
    },
    useMemoCache: Vc,
    useCacheRefresh: jd,
    useEffectEvent: bd
  }, qv = {
    readContext: Gl,
    use: wn,
    useCallback: Nd,
    useContext: Gl,
    useEffect: Fc,
    useImperativeHandle: zd,
    useInsertionEffect: Td,
    useLayoutEffect: _d,
    useMemo: Od,
    useReducer: Kc,
    useRef: gd,
    useState: function() {
      return Kc(da);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = Al();
      return ml === null ? Wc(a, l, t) : Ad(
        a,
        ml.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Kc(da)[0], t = Al().memoizedState;
      return [
        typeof l == "boolean" ? l : Hu(l),
        t
      ];
    },
    useSyncExternalStore: td,
    useId: Cd,
    useHostTransitionStatus: Ic,
    useFormState: yd,
    useActionState: yd,
    useOptimistic: function(l, t) {
      var a = Al();
      return ml !== null ? cd(a, ml, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Vc,
    useCacheRefresh: jd,
    useEffectEvent: bd
  };
  function lf(l, t, a, e) {
    t = l.memoizedState, a = a(e, t), a = a == null ? t : w({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var tf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var e = yt(), u = Ma(e);
      u.payload = t, a != null && (u.callback = a), t = xa(l, u, e), t !== null && (et(t, l, e), Cu(t, l, e));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var e = yt(), u = Ma(e);
      u.tag = 1, u.payload = t, a != null && (u.callback = a), t = xa(l, u, e), t !== null && (et(t, l, e), Cu(t, l, e));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = yt(), e = Ma(a);
      e.tag = 2, t != null && (e.callback = t), t = xa(l, e, a), t !== null && (et(t, l, a), Cu(t, l, a));
    }
  };
  function qd(l, t, a, e, u, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(e, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Eu(a, e) || !Eu(u, n) : !0;
  }
  function Yd(l, t, a, e) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, e), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, e), t.state !== l && tf.enqueueReplaceState(t, t.state, null);
  }
  function re(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var e in t)
        e !== "ref" && (a[e] = t[e]);
    }
    if (l = l.defaultProps) {
      a === t && (a = w({}, a));
      for (var u in l)
        a[u] === void 0 && (a[u] = l[u]);
    }
    return a;
  }
  function Gd(l) {
    An(l);
  }
  function Xd(l) {
    console.error(l);
  }
  function Qd(l) {
    An(l);
  }
  function Pn(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function Zd(l, t, a) {
    try {
      var e = l.onCaughtError;
      e(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function af(l, t, a) {
    return a = Ma(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      Pn(l, t);
    }, a;
  }
  function Vd(l) {
    return l = Ma(l), l.tag = 3, l;
  }
  function Ld(l, t, a, e) {
    var u = a.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var n = e.value;
      l.payload = function() {
        return u(n);
      }, l.callback = function() {
        Zd(t, a, e);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Zd(t, a, e), typeof u != "function" && (qa === null ? qa = /* @__PURE__ */ new Set([this]) : qa.add(this));
      var c = e.stack;
      this.componentDidCatch(e.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Yv(l, t, a, e, u) {
    if (a.flags |= 32768, e !== null && typeof e == "object" && typeof e.then == "function") {
      if (t = a.alternate, t !== null && ue(
        t,
        a,
        u,
        !0
      ), a = Xl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return wl === null ? Ti() : a.alternate === null && Ol === 0 && (Ol = 3), a.flags &= -257, a.flags |= 65536, a.lanes = u, e === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([e]) : t.add(e), Qf(l, e, u)), !1;
          case 22:
            return a.flags |= 65536, e === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([e])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([e]) : a.add(e)), Qf(l, e, u)), !1;
        }
        throw Error(h(435, a.tag));
      }
      return Qf(l, e, u), Ti(), !1;
    }
    if (K)
      return t = Xl.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = u, e !== Ec && (l = Error(h(422), { cause: e }), Ou(Et(l, a)))) : (e !== Ec && (t = Error(h(423), {
        cause: e
      }), Ou(
        Et(t, a)
      )), l = l.current.alternate, l.flags |= 65536, u &= -u, l.lanes |= u, e = Et(e, a), u = af(
        l.stateNode,
        e,
        u
      ), Uc(l, u), Ol !== 4 && (Ol = 2)), !1;
    var n = Error(h(520), { cause: e });
    if (n = Et(n, a), Lu === null ? Lu = [n] : Lu.push(n), Ol !== 4 && (Ol = 2), t === null) return !0;
    e = Et(e, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = u & -u, a.lanes |= l, l = af(a.stateNode, e, l), Uc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (qa === null || !qa.has(n))))
            return a.flags |= 65536, u &= -u, a.lanes |= u, u = Vd(u), Ld(
              u,
              l,
              a,
              e
            ), Uc(a, u), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var ef = Error(h(461)), xl = !1;
  function jl(l, t, a, e) {
    t.child = l === null ? Fo(t, null, a, e) : oe(
      t,
      l.child,
      a,
      e
    );
  }
  function Kd(l, t, a, e, u) {
    a = a.render;
    var n = t.ref;
    if ("ref" in e) {
      var i = {};
      for (var c in e)
        c !== "ref" && (i[c] = e[c]);
    } else i = e;
    return ne(t), e = Gc(
      l,
      t,
      a,
      i,
      n,
      u
    ), c = Xc(), l !== null && !xl ? (Qc(l, t, u), ra(l, t, u)) : (K && c && Un(t), t.flags |= 1, jl(l, t, e, u), t.child);
  }
  function Jd(l, t, a, e, u) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Sc(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, wd(
        l,
        t,
        n,
        e,
        u
      )) : (l = Cn(
        a.type,
        null,
        e,
        t,
        t.mode,
        u
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !rf(l, u)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Eu, a(i, e) && l.ref === t.ref)
        return ra(l, t, u);
    }
    return t.flags |= 1, l = ia(n, e), l.ref = t.ref, l.return = t, t.child = l;
  }
  function wd(l, t, a, e, u) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Eu(n, e) && l.ref === t.ref)
        if (xl = !1, t.pendingProps = e = n, rf(l, u))
          (l.flags & 131072) !== 0 && (xl = !0);
        else
          return t.lanes = l.lanes, ra(l, t, u);
    }
    return uf(
      l,
      t,
      a,
      e,
      u
    );
  }
  function Fd(l, t, a, e) {
    var u = e.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), e.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, l !== null) {
          for (e = t.child = l.child, u = 0; e !== null; )
            u = u | e.lanes | e.childLanes, e = e.sibling;
          e = u & ~n;
        } else e = 0, t.child = null;
        return $d(
          l,
          t,
          n,
          a,
          e
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && qn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? ko(t, n) : Rc(), Io(t);
      else
        return e = t.lanes = 536870912, $d(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          e
        );
    } else
      n !== null ? (qn(t, n.cachePool), ko(t, n), Ua(), t.memoizedState = null) : (l !== null && qn(t, null), Rc(), Ua());
    return jl(l, t, u, a), t.child;
  }
  function qu(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function $d(l, t, a, e, u) {
    var n = Mc();
    return n = n === null ? null : { parent: Dl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && qn(t, null), Rc(), Io(t), l !== null && ue(l, t, e, !0), t.childLanes = u, null;
  }
  function li(l, t) {
    return t = ti(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function Wd(l, t, a) {
    return oe(t, l.child, null, a), l = li(t, t.pendingProps), l.flags |= 2, rt(t), t.memoizedState = null, l;
  }
  function Gv(l, t, a) {
    var e = t.pendingProps, u = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (K) {
        if (e.mode === "hidden")
          return l = li(t, e), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, qu(null, l);
        if (Bc(t), (l = bl) ? (l = E0(
          l,
          Ot
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ea !== null ? { id: Zt, overflow: Vt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = po(l), a.return = t, t.child = a, Rl = t, bl = null)) : l = null, l === null) throw Na(t);
        return t.lanes = 536870912, null;
      }
      return li(t, e);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Bc(t), u)
        if (t.flags & 256)
          t.flags &= -257, t = Wd(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(h(558));
      else if (xl || ue(l, t, a, !1), u = (a & l.childLanes) !== 0, xl || u) {
        if (Ca.current === null) {
          if (e = yl, e !== null && (i = Hs(e, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, le(l, i), et(e, l, i), ef;
          Ti();
        }
        t = Wd(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, bl = Dt(i.nextSibling), Rl = t, K = !0, za = null, Ot = !1, l !== null && Bo(t, l), t = li(t, e), t.flags |= 134221824;
      return t;
    }
    return l = ia(l.child, {
      mode: e.mode,
      children: e.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Ze(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(h(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function uf(l, t, a, e, u) {
    return ne(t), a = Gc(
      l,
      t,
      a,
      e,
      void 0,
      u
    ), e = Xc(), l !== null && !xl ? (Qc(l, t, u), ra(l, t, u)) : (K && e && Un(t), t.flags |= 1, jl(l, t, a, u), t.child);
  }
  function kd(l, t, a, e, u, n) {
    return ne(t), t.updateQueue = null, a = ld(
      t,
      e,
      a,
      u
    ), Po(l), e = Xc(), l !== null && !xl ? (Qc(l, t, n), ra(l, t, n)) : (K && e && Un(t), t.flags |= 1, jl(l, t, a, n), t.child);
  }
  function Id(l, t, a, e, u) {
    if (ne(t), t.stateNode === null) {
      var n = Ue, i = a.contextType;
      typeof i == "object" && i !== null && (n = Gl(i)), n = new a(e, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = tf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = e, n.state = t.memoizedState, n.refs = {}, Cc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Gl(i) : Ue, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (lf(
        t,
        a,
        i,
        e
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && tf.enqueueReplaceState(n, n.state, null), Uu(t, e, n, u), ju(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), e = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = re(a, c);
      n.props = f;
      var v = n.context, S = a.contextType;
      i = Ue, typeof S == "object" && S !== null && (i = Gl(S));
      var E = a.getDerivedStateFromProps;
      S = typeof E == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, S || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || v !== i) && Yd(
        t,
        n,
        e,
        i
      ), Da = !1;
      var r = t.memoizedState;
      n.state = r, Uu(t, e, n, u), ju(), v = t.memoizedState, c || r !== v || Da ? (typeof E == "function" && (lf(
        t,
        a,
        E,
        e
      ), v = t.memoizedState), (f = Da || qd(
        t,
        a,
        f,
        e,
        r,
        v,
        i
      )) ? (S || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = e, t.memoizedState = v), n.props = e, n.state = v, n.context = i, e = f) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), e = !1);
    } else {
      n = t.stateNode, jc(l, t), i = t.memoizedProps, S = re(a, i), n.props = S, E = t.pendingProps, r = n.context, v = a.contextType, f = Ue, typeof v == "object" && v !== null && (f = Gl(v)), c = a.getDerivedStateFromProps, (v = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== E || r !== f) && Yd(
        t,
        n,
        e,
        f
      ), Da = !1, r = t.memoizedState, n.state = r, Uu(t, e, n, u), ju();
      var g = t.memoizedState;
      i !== E || r !== g || Da || l !== null && l.dependencies !== null && Hn(l.dependencies) ? (typeof c == "function" && (lf(
        t,
        a,
        c,
        e
      ), g = t.memoizedState), (S = Da || qd(
        t,
        a,
        S,
        e,
        r,
        g,
        f
      ) || l !== null && l.dependencies !== null && Hn(l.dependencies)) ? (v || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(e, g, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        e,
        g,
        f
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), t.memoizedProps = e, t.memoizedState = g), n.props = e, n.state = g, n.context = f, e = S) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), e = !1);
    }
    return n = e, Ze(l, t), e = (t.flags & 128) !== 0, n || e ? (n = t.stateNode, a = e && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && e ? (t.child = oe(
      t,
      l.child,
      null,
      u
    ), t.child = oe(
      t,
      null,
      a,
      u
    )) : jl(l, t, a, u), t.memoizedState = n.state, l = t.child) : l = ra(
      l,
      t,
      u
    ), l;
  }
  function Pd(l, t, a, e) {
    return ae(), t.flags |= 256, jl(l, t, a, e), t.child;
  }
  var nf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function cf(l) {
    return { baseLanes: l, cachePool: Zo() };
  }
  function ff(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= ht), l;
  }
  function lr(l, t, a) {
    var e = t.pendingProps, u = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Ql.current & 2) !== 0), i && (u = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (K) {
        if (u ? ja(t) : Ua(), (l = bl) ? (l = E0(
          l,
          Ot
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ea !== null ? { id: Zt, overflow: Vt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = po(l), a.return = t, t.child = a, Rl = t, bl = null)) : l = null, l === null) throw Na(t);
        return cs(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = e.children, e = e.fallback, u ? (Ua(), u = t.mode, n = ti(
        { mode: "hidden", children: n },
        u
      ), e = te(
        e,
        u,
        a,
        null
      ), n.return = t, e.return = t, n.sibling = e, t.child = n, e = t.child, e.memoizedState = cf(a), e.childLanes = ff(
        l,
        i,
        a
      ), t.memoizedState = nf, qu(null, e)) : (ja(t), sf(t, n));
    }
    var c = l.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return Xv(
          l,
          t,
          n,
          i,
          e,
          f,
          c,
          a
        );
    }
    return u ? (Ua(), u = e.fallback, n = t.mode, c = l.child, f = c.sibling, e = ia(c, {
      mode: "hidden",
      children: e.children
    }), e.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? u = ia(f, u) : (u = te(
      u,
      n,
      a,
      null
    ), u.flags |= 2), u.return = t, e.return = t, e.sibling = u, t.child = e, qu(null, e), e = t.child, u = l.child.memoizedState, u === null ? u = cf(a) : (n = u.cachePool, n !== null ? (c = Dl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Zo(), u = {
      baseLanes: u.baseLanes | a,
      cachePool: n
    }), e.memoizedState = u, e.childLanes = ff(
      l,
      i,
      a
    ), t.memoizedState = nf, qu(l.child, e)) : (ja(t), a = l.child, l = a.sibling, a = ia(a, {
      mode: "visible",
      children: e.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function sf(l, t) {
    return t = ti(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function ti(l, t) {
    return l = Pl(22, l, null, t), l.lanes = 0, l;
  }
  function ai(l, t, a) {
    return oe(t, l.child, null, a), l = sf(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Xv(l, t, a, e, u, n, i, c) {
    if (a)
      return t.flags & 256 ? (ja(t), t.flags &= -257, ai(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Ua(), t.child = l.child, t.flags |= 128, null) : (Ua(), n = u.fallback, i = t.mode, u = ti(
        { mode: "visible", children: u.children },
        i
      ), n = te(
        n,
        i,
        c,
        null
      ), n.flags |= 2, u.return = t, n.return = t, u.sibling = n, t.child = u, oe(t, l.child, null, c), u = t.child, u.memoizedState = cf(c), u.childLanes = ff(
        l,
        e,
        c
      ), t.memoizedState = nf, qu(null, u));
    if (ja(t), cs(n)) {
      if (e = n.nextSibling && n.nextSibling.dataset, e) var f = e.dgst;
      return e = f, e !== "" && (u = Error(h(419)), u.stack = "", u.digest = e, Ou({ value: u, source: null, stack: null })), ai(
        l,
        t,
        c
      );
    }
    if (xl || ue(l, t, c, !1), e = (c & l.childLanes) !== 0, xl || e) {
      if (Ca.current !== null)
        return ai(
          l,
          t,
          c
        );
      if (e = yl, e !== null && (u = Hs(
        e,
        c
      ), u !== 0 && u !== i.retryLane))
        throw i.retryLane = u, le(l, u), et(e, l, u), ef;
      return is(n) || Ti(), ai(
        l,
        t,
        c
      );
    }
    return is(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, bl = Dt(n.nextSibling), Rl = t, K = !0, za = null, Ot = !1, l !== null && Bo(t, l), t = sf(
      t,
      u.children
    ), t.flags |= 134221824, t);
  }
  function tr(l, t, a) {
    l.lanes |= t;
    var e = l.alternate;
    e !== null && (e.lanes |= t), Rn(l.return, t, a);
  }
  function ar(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && Vn(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function ei(l, t, a, e, u, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: e,
      tail: a,
      tailMode: u,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = e, i.tail = a, i.tailMode = u, i.treeForkCount = n);
  }
  function of(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function df(l, t, a) {
    var e = t.pendingProps, u = e.revealOrder, n = e.tail;
    e = e.children;
    var i = Ql.current;
    if (t.flags & 128)
      return pu(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, pu(t, i), u === "backwards" && l !== null ? (of(l), jl(l, t, e, a), of(l)) : jl(l, t, e, a), e = K ? Nu : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && tr(l, a, t);
        else if (l.tag === 19)
          tr(l, a, t);
        else if (l.child !== null) {
          l.child.return = l, l = l.child;
          continue;
        }
        if (l === t) break l;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t)
            break l;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    switch (u) {
      case "backwards":
        a = ar(t.child), a === null ? (u = t.child, t.child = null) : (u = a.sibling, a.sibling = null, of(t)), ei(
          t,
          !0,
          u,
          null,
          n,
          e
        );
        break;
      case "unstable_legacy-backwards":
        for (a = null, u = t.child, t.child = null; u !== null; ) {
          if (l = u.alternate, l !== null && Vn(l) === null) {
            t.child = u;
            break;
          }
          l = u.sibling, u.sibling = a, a = u, u = l;
        }
        ei(
          t,
          !0,
          a,
          null,
          n,
          e
        );
        break;
      case "together":
        ei(
          t,
          !1,
          null,
          null,
          void 0,
          e
        );
        break;
      case "independent":
        t.memoizedState = null;
        break;
      default:
        a = ar(t.child), a === null ? (u = t.child, t.child = null) : (u = a.sibling, a.sibling = null), ei(
          t,
          !1,
          u,
          a,
          n,
          e
        );
    }
    return t.child;
  }
  function er(l, t, a) {
    var e = t.pendingProps;
    return Oa(t, t.type, e.value), jl(l, t, e.children, a), t.child;
  }
  function ra(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), Ba |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (ue(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(h(153));
    if (t.child !== null) {
      for (l = t.child, a = ia(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = ia(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function rf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && Hn(l)));
  }
  function Qv(l, t, a) {
    switch (t.tag) {
      case 3:
        fn(t, t.stateNode.containerInfo), Oa(t, Dl, l.memoizedState.cache), ae();
        break;
      case 27:
      case 5:
        Yi(t);
        break;
      case 4:
        fn(t, t.stateNode.containerInfo);
        break;
      case 10:
        Oa(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Bc(t), null;
        break;
      case 13:
        var e = t.memoizedState;
        if (e !== null) {
          if (e.dehydrated !== null)
            return ja(t), t.flags |= 128, null;
          e = ue(
            l,
            t,
            a,
            !1
          );
          var u = t.child.childLanes;
          return e || (a & u) !== 0 ? lr(l, t, a) : (ja(t), l = ra(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        ja(t);
        break;
      case 19:
        if (t.flags & 128)
          return df(
            l,
            t,
            a
          );
        if (u = (l.flags & 128) !== 0, e = (a & t.childLanes) !== 0, e || (ue(
          l,
          t,
          a,
          !1
        ), e = (a & t.childLanes) !== 0), u) {
          if (e)
            return df(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (u = t.memoizedState, u !== null && (u.rendering = null, u.tail = null, u.lastEffect = null), pu(t, Ql.current), e) break;
        return null;
      case 22:
        return t.lanes = 0, Fd(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        Oa(t, Dl, l.memoizedState.cache);
    }
    return ra(l, t, a);
  }
  function ur(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        xl = !0;
      else {
        if (!rf(l, a) && (t.flags & 128) === 0)
          return xl = !1, Qv(
            l,
            t,
            a
          );
        xl = (l.flags & 131072) !== 0;
      }
    else
      xl = !1, K && (t.flags & 1048576) !== 0 && Ho(t, Nu, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var e = t.pendingProps;
          if (l = fe(t.elementType), t.type = l, typeof l == "function")
            Sc(l) ? (e = re(l, e), t.tag = 1, t = Id(
              null,
              t,
              l,
              e,
              a
            )) : (t.tag = 0, t = uf(
              null,
              t,
              l,
              e,
              a
            ));
          else {
            if (l != null) {
              var u = l.$$typeof;
              if (u === A) {
                t.tag = 11, t = Kd(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break l;
              } else if (u === hl) {
                t.tag = 14, t = Jd(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break l;
              } else if (u === Ul) {
                t.tag = 10, t.type = l, t = er(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = tl(l) || l, Error(h(306, t, ""));
          }
        }
        return t;
      case 0:
        return uf(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return e = t.type, u = re(
          e,
          t.pendingProps
        ), Id(
          l,
          t,
          e,
          u,
          a
        );
      case 3:
        l: {
          if (fn(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(h(387));
          e = t.pendingProps;
          var n = t.memoizedState;
          u = n.element, jc(l, t), Uu(t, e, null, a);
          var i = t.memoizedState;
          if (e = i.cache, Oa(t, Dl, e), e !== n.cache && Oc(
            t,
            [Dl],
            a,
            !0
          ), ju(), e = i.element, n.isDehydrated)
            if (n = {
              element: e,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = Pd(
                l,
                t,
                e,
                a
              );
              break l;
            } else if (e !== u) {
              u = Et(
                Error(h(424)),
                t
              ), Ou(u), t = Pd(
                l,
                t,
                e,
                a
              );
              break l;
            } else {
              switch (l = t.stateNode.containerInfo, l.nodeType) {
                case 9:
                  l = l.body;
                  break;
                default:
                  l = l.nodeName === "HTML" ? l.ownerDocument.body : l;
              }
              for (bl = Dt(l.firstChild), Rl = t, K = !0, za = null, Ot = !0, a = Fo(
                t,
                null,
                e,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
            }
          else {
            if (ae(), e === u) {
              t = ra(
                l,
                t,
                a
              );
              break l;
            }
            jl(l, t, e, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Ze(l, t), l === null ? (a = x0(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : K || (t.stateNode = f0(
          t.type,
          t.pendingProps,
          ga.current,
          t
        )) : t.memoizedState = x0(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return Yi(t), l === null && K && (e = t.stateNode = O0(
          t.type,
          t.pendingProps,
          ga.current
        ), Rl = t, Ot = !0, u = bl, Xa(t.type) ? (fs = u, bl = Dt(e.firstChild)) : bl = u), jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), Ze(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && K && ((u = e = bl) && (e = Hh(
          e,
          t.type,
          t.pendingProps,
          Ot
        ), e !== null ? (t.stateNode = e, Rl = t, bl = Dt(e.firstChild), Ot = !1, u = !0) : u = !1), u || Na(t)), Yi(t), u = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, e = n.children, Pf(u, n) ? e = null : i !== null && Pf(u, i) && (t.flags |= 32), t.memoizedState !== null && (u = Gc(
          l,
          t,
          Cv,
          null,
          null,
          a
        ), iu._currentValue = u), Ze(l, t), jl(l, t, e, a), t.child;
      case 6:
        return l === null && K && ((l = a = bl) && (a = Bh(
          a,
          t.pendingProps,
          Ot
        ), a !== null ? (t.stateNode = a, Rl = t, bl = null, l = !0) : l = !1), l || Na(t)), null;
      case 13:
        return lr(l, t, a);
      case 4:
        return fn(
          t,
          t.stateNode.containerInfo
        ), e = t.pendingProps, l === null ? t.child = oe(
          t,
          null,
          e,
          a
        ) : jl(l, t, e, a), t.child;
      case 11:
        return Kd(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return e = t.pendingProps, Ze(l, t), jl(l, t, e, a), t.child;
      case 8:
        return jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return er(l, t, a);
      case 9:
        return u = t.type._context, e = t.pendingProps.children, ne(t), u = Gl(u), e = e(u), t.flags |= 1, jl(l, t, e, a), t.child;
      case 14:
        return Jd(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return wd(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return df(l, t, a);
      case 31:
        return Gv(l, t, a);
      case 22:
        return Fd(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return ne(t), e = Gl(Dl), l === null ? (u = Mc(), u === null && (u = yl, n = Ac(), u.pooledCache = n, n.refCount++, n !== null && (u.pooledCacheLanes |= a), u = n), t.memoizedState = { parent: e, cache: u }, Cc(t), Oa(t, Dl, u)) : ((l.lanes & a) !== 0 && (jc(l, t), Uu(t, null, null, a), ju()), u = l.memoizedState, n = t.memoizedState, u.parent !== e ? (u = { parent: e, cache: e }, t.memoizedState = u, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = u), Oa(t, Dl, e)) : (e = n.cache, Oa(t, Dl, e), e !== u.cache && Oc(
          t,
          [Dl],
          a,
          !0
        ))), jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 30:
        return t.stateNode === null && (t.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), e = t.pendingProps, e.name != null && e.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : K && Un(t), l !== null && l.memoizedProps.name !== e.name ? t.flags |= 4194816 : Ze(l, t), jl(l, t, e.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(h(156, t.tag));
  }
  function ma(l) {
    l.flags |= 4;
  }
  function mf(l, t, a, e, u) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? p0(t, e) : p0(t, e) && (e.src !== a.src || e.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (u & 335544128) === u)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Gr()) l.flags |= 8192;
        else
          throw se = Gn, xc;
    } else l.flags &= -16777217;
  }
  function nr(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !R0(t))
      if (Gr()) l.flags |= 8192;
      else
        throw se = Gn, xc;
  }
  function ui(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Us() : 536870912, l.lanes |= t, we |= t);
  }
  function Yu(l, t) {
    if (!K)
      switch (l.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var a = l.tail, e = null; a !== null; )
            a.alternate !== null && (e = a), a = a.sibling;
          e === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : e.sibling = null;
          break;
        default:
          for (t = l.tail, a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? l.tail = null : a.sibling = null;
      }
  }
  function Tl(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, e = 0;
    if (t)
      for (var u = l.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags & 1206910976, e |= u.flags & 1206910976, u.return = l, u = u.sibling;
    else
      for (u = l.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags, e |= u.flags, u.return = l, u = u.sibling;
    return l.subtreeFlags |= e, l.childLanes = a, t;
  }
  function Zv(l, t, a) {
    var e = t.pendingProps;
    switch (_c(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Tl(t), null;
      case 1:
        return Tl(t), null;
      case 3:
        return a = t.stateNode, e = null, l !== null && (e = l.memoizedState.cache), t.memoizedState.cache !== e && (t.flags |= 2048), sa(Dl), be(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (He(t) ? ma(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, zc())), Tl(t), null;
      case 26:
        var u = t.type, n = t.memoizedState;
        return l === null ? (ma(t), n !== null ? (Tl(t), nr(t, n)) : (Tl(t), mf(
          t,
          u,
          null,
          e,
          a
        ))) : n ? n !== l.memoizedState ? (ma(t), Tl(t), nr(t, n)) : (Tl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== e && ma(t), Tl(t), mf(
          t,
          u,
          l,
          e,
          a
        )), null;
      case 27:
        if (sn(t), a = ga.current, u = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== e && ma(t);
        else {
          if (!e) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Tl(t), t.subtreeFlags &= -33554433, null;
          }
          l = Xt.current, He(t) ? qo(t) : (l = O0(u, e, a), t.stateNode = l, ma(t));
        }
        return Tl(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (sn(t), u = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== e && ma(t);
        else {
          if (!e) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Tl(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = Xt.current, He(t))
            qo(t);
          else {
            var i = $u(
              ga.current
            );
            switch (n) {
              case 1:
                n = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  u
                );
                break;
              case 2:
                n = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  u
                );
                break;
              default:
                switch (u) {
                  case "svg":
                    n = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      u
                    );
                    break;
                  case "math":
                    n = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      u
                    );
                    break;
                  case "script":
                    n = i.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(
                      n.firstChild
                    );
                    break;
                  case "select":
                    n = typeof e.is == "string" ? i.createElement("select", {
                      is: e.is
                    }) : i.createElement("select"), e.multiple ? n.multiple = !0 : e.size && (n.size = e.size);
                    break;
                  default:
                    n = typeof e.is == "string" ? i.createElement(u, { is: e.is }) : i.createElement(u);
                }
            }
            n[Yl] = t, n[Il] = e;
            l: for (i = t.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                n.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === t) break l;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === t)
                  break l;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            t.stateNode = n;
            l: switch (Vl(n, u, e), u) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                e = !!e.autoFocus;
                break l;
              case "img":
                e = !0;
                break l;
              default:
                e = !1;
            }
            e && ma(t);
          }
        }
        return Tl(t), t.subtreeFlags &= -33554433, mf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== e && ma(t);
        else {
          if (typeof e != "string" && t.stateNode === null)
            throw Error(h(166));
          if (l = ga.current, He(t)) {
            if (l = t.stateNode, a = t.memoizedProps, e = null, u = Rl, u !== null)
              switch (u.tag) {
                case 27:
                case 5:
                  e = u.memoizedProps;
              }
            l[Yl] = t, l = !!(l.nodeValue === a || e !== null && e.suppressHydrationWarning === !0 || u0(l.nodeValue, a)), l || Na(t, !0);
          } else
            l = $u(l).createTextNode(
              e
            ), l[Yl] = t, t.stateNode = l;
        }
        return Tl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (e = He(t), a !== null) {
            if (l === null) {
              if (!e) throw Error(h(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(557));
              l[Yl] = t;
            } else
              ae(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Tl(t), l = !1;
          } else
            a = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (rt(t), t) : (rt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(h(558));
        }
        return Tl(t), null;
      case 13:
        if (e = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (u = He(t), e !== null && e.dehydrated !== null) {
            if (l === null) {
              if (!u) throw Error(h(318));
              if (u = t.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(h(317));
              u[Yl] = t;
            } else
              ae(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Tl(t), u = !1;
          } else
            u = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = u), u = !0;
          if (!u)
            return t.flags & 256 ? (rt(t), t) : (rt(t), null);
        }
        return rt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = e !== null, l = l !== null && l.memoizedState !== null, a && (e = t.child, u = null, e.alternate !== null && e.alternate.memoizedState !== null && e.alternate.memoizedState.cachePool !== null && (u = e.alternate.memoizedState.cachePool.pool), n = null, e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), n !== u && (e.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), ui(t, t.updateQueue), Tl(t), null);
      case 4:
        return be(), l === null && Ff(t.stateNode.containerInfo), t.flags |= 67108864, Tl(t), null;
      case 10:
        return sa(t.type), Tl(t), null;
      case 19:
        if (qc(t), e = t.memoizedState, e === null) return Tl(t), null;
        if (u = (t.flags & 128) !== 0, n = e.rendering, n === null)
          if (u) Yu(e, !1);
          else {
            if (Ol !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Vn(l), n !== null) {
                  for (t.flags |= 128, Yu(e, !1), l = n.updateQueue, t.updateQueue = l, ui(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    Uo(a, l), a = a.sibling;
                  return pu(
                    t,
                    Ql.current & 1 | 2
                  ), K && ca(t, e.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            e.tail !== null && ct() > yi && (t.flags |= 128, u = !0, Yu(e, !1), t.lanes = 4194304);
          }
        else {
          if (!u)
            if (l = Vn(n), l !== null) {
              if (t.flags |= 128, u = !0, l = l.updateQueue, t.updateQueue = l, ui(t, l), Yu(e, !0), e.tail === null && e.tailMode !== "collapsed" && e.tailMode !== "visible" && !n.alternate && !K)
                return Tl(t), null;
            } else
              2 * ct() - e.renderingStartTime > yi && a !== 536870912 && (t.flags |= 128, u = !0, Yu(e, !1), t.lanes = 4194304);
          e.isBackwards ? (n.sibling = t.child, t.child = n) : (l = e.last, l !== null ? l.sibling = n : t.child = n, e.last = n);
        }
        if (e.tail !== null) {
          l = e.tail;
          l: {
            for (a = l; a !== null; ) {
              if (a.alternate !== null) {
                a = !1;
                break l;
              }
              a = a.sibling;
            }
            a = !0;
          }
          return e.rendering = l, e.tail = l.sibling, e.renderingStartTime = ct(), l.sibling = null, n = Ql.current, n = u ? n & 1 | 2 : n & 1, e.tailMode === "visible" || e.tailMode === "collapsed" || !a || K ? pu(t, n) : (a = n, Sl(Xl, t), Sl(Ql, a), wl === null && (wl = t)), K && ca(t, e.treeForkCount), l;
        }
        return Tl(t), null;
      case 22:
      case 23:
        return rt(t), Hc(), e = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== e && (t.flags |= 8192) : e && (t.flags |= 8192), e ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Tl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Tl(t), a = t.updateQueue, a !== null && ui(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== a && (t.flags |= 2048), l !== null && ql(ce), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), sa(Dl), Tl(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Tl(t), null;
    }
    throw Error(h(156, t.tag));
  }
  function Vv(l, t) {
    switch (_c(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return sa(Dl), be(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return sn(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (rt(t), t.alternate === null)
            throw Error(h(340));
          ae();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (rt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(h(340));
          ae();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return qc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return be(), null;
      case 10:
        return sa(t.type), null;
      case 22:
      case 23:
        return rt(t), Hc(), l !== null && ql(ce), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return sa(Dl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function ir(l, t) {
    switch (_c(t), t.tag) {
      case 3:
        sa(Dl), be();
        break;
      case 26:
      case 27:
      case 5:
        sn(t);
        break;
      case 4:
        be();
        break;
      case 31:
        t.memoizedState !== null && rt(t);
        break;
      case 13:
        rt(t);
        break;
      case 19:
        qc(t);
        break;
      case 10:
        sa(t.type);
        break;
      case 22:
      case 23:
        rt(t), Hc(), l !== null && ql(ce);
        break;
      case 24:
        sa(Dl);
    }
  }
  function Gu(l, t) {
    try {
      var a = t.updateQueue, e = a !== null ? a.lastEffect : null;
      if (e !== null) {
        var u = e.next;
        a = u;
        do {
          if ((a.tag & l) === l) {
            e = void 0;
            var n = a.create, i = a.inst;
            e = n(), i.destroy = e;
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (c) {
      ol(t, t.return, c);
    }
  }
  function pa(l, t, a) {
    try {
      var e = t.updateQueue, u = e !== null ? e.lastEffect : null;
      if (u !== null) {
        var n = u.next;
        e = n;
        do {
          if ((e.tag & l) === l) {
            var i = e.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, u = t;
              var f = a, v = c;
              try {
                v();
              } catch (S) {
                ol(
                  u,
                  f,
                  S
                );
              }
            }
          }
          e = e.next;
        } while (e !== n);
      }
    } catch (S) {
      ol(t, t.return, S);
    }
  }
  function cr(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        Wo(t, a);
      } catch (e) {
        ol(l, l.return, e);
      }
    }
  }
  function fr(l, t, a) {
    a.props = re(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (e) {
      ol(l, t, e);
    }
  }
  function Lt(l, t) {
    try {
      var a = l.ref;
      if (a !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var e = l.stateNode;
            break;
          case 30:
            var u = l.stateNode, n = ua(l.memoizedProps, u);
            (u.ref === null || u.ref.name !== n) && (u.ref = h0(n)), e = u.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new gt(l);
              T(
                l.child,
                !1,
                ph,
                i,
                void 0,
                void 0
              ), l.stateNode = i;
            }
            e = l.stateNode;
            break;
          default:
            e = l.stateNode;
        }
        typeof a == "function" ? l.refCleanup = a(e) : a.current = e;
      }
    } catch (c) {
      ol(l, t, c);
    }
  }
  function Zl(l, t) {
    var a = l.ref, e = l.refCleanup;
    if (a !== null)
      if (typeof e == "function")
        try {
          e();
        } catch (u) {
          ol(l, t, u);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (u) {
          ol(l, t, u);
        }
      else a.current = null;
  }
  function ni(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        _0(
          l.stateNode,
          t[a]
        );
  }
  function sr(l) {
    for (var t = l.return; t !== null && (hf(t) && _0(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function Xu(l) {
    for (var t = l.return; t !== null && (hf(t) && Rh(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function vf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function hf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function yf(l) {
    var t = l.type, a = l.memoizedProps, e = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && e.focus();
          break l;
        case "img":
          a.src ? e.src = a.src : a.srcSet && (e.srcset = a.srcSet);
      }
    } catch (u) {
      ol(l, l.return, u);
    }
  }
  function gf(l, t, a) {
    try {
      var e = l.stateNode;
      hh(e, l.type, a, t), e[Il] = t;
    } catch (u) {
      ol(l, l.return, u);
    }
  }
  function or(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Xa(l.type) || l.tag === 4;
  }
  function Sf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || or(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Xa(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function bf(l, t, a, e) {
    var u = l.tag;
    if (u === 5 || u === 6)
      u = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(u, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(u), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Qt)), ni(l, e), al = !0;
    else if (u !== 4 && (u === 27 && (ni(l, e), e = null, Xa(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (bf(
        l,
        t,
        a,
        e
      ), l = l.sibling; l !== null; )
        bf(
          l,
          t,
          a,
          e
        ), l = l.sibling;
  }
  function ii(l, t, a, e) {
    var u = l.tag;
    if (u === 5 || u === 6)
      u = l.stateNode, t ? a.insertBefore(u, t) : a.appendChild(u), ni(l, e), al = !0;
    else if (u !== 4 && (u === 27 && (ni(l, e), e = null, Xa(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (ii(
        l,
        t,
        a,
        e
      ), l = l.sibling; l !== null; )
        ii(
          l,
          t,
          a,
          e
        ), l = l.sibling;
  }
  function dr(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var e = l.type, u = t.attributes; u.length; )
        t.removeAttributeNode(u[0]);
      Vl(t, e, a), t[Yl] = l, t[Il] = a;
    } catch (n) {
      ol(l, l.return, n);
    }
  }
  var ci = !1, mt = null;
  function rr(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (ci = !0);
  }
  var Kt = null;
  function mr() {
    var l = Kt;
    return Kt = null, l;
  }
  var lt = 0;
  function Ve(l, t, a, e, u) {
    return lt = 0, vr(
      l.child,
      t,
      a,
      e,
      u
    );
  }
  function vr(l, t, a, e, u) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (e !== null) {
          var c = as(i);
          e.push(c), c.view && (n = !0);
        } else
          n || as(i).view && (n = !0);
        ci = !0, m0(
          i,
          lt === 0 ? t : t + "_" + lt,
          a
        ), lt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && u || vr(
        l.child,
        t,
        a,
        e,
        u
      ) && (n = !0));
      l = l.sibling;
    }
    return n;
  }
  function Jt(l, t) {
    for (; l !== null; )
      l.tag === 5 ? v0(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || Jt(
        l.child,
        t
      )), l = l.sibling;
  }
  function fi(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (fi(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(h(544));
          var a = t.name;
          t = na(t.default, t.share), t !== "none" && (Ve(
            l,
            a,
            t,
            null,
            !1
          ) || Jt(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function Tf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, e = l.memoizedProps, u = ua(e, a), n = na(
        e.default,
        a.paired ? e.share : e.enter
      );
      n !== "none" ? Ve(l, u, n, null, !1) ? (fi(l), a.paired || t || ke(l, e.onEnter)) : Jt(l.child, !1) : fi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Tf(l, t), l = l.sibling;
    else fi(l);
  }
  function _f(l) {
    if (mt !== null && mt.size !== 0) {
      var t = mt;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var a = l.memoizedProps, e = a.name;
              if (e != null && e !== "auto") {
                var u = t.get(e);
                if (u !== void 0) {
                  var n = na(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (Ve(
                    l,
                    e,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, u.paired = n, n.paired = u, ke(l, a.onShare)) : Jt(l.child, !1)), t.delete(e), t.size === 0) break;
                }
              }
            }
            _f(l);
          }
          l = l.sibling;
        }
    }
  }
  function Ef(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = ua(t, l.stateNode), e = mt !== null ? mt.get(a) : void 0, u = na(
        t.default,
        e !== void 0 ? t.share : t.exit
      );
      u !== "none" && (Ve(l, a, u, null, !1) ? e !== void 0 ? (u = l.stateNode, e.paired = u, u.paired = e, mt.delete(a), ke(l, t.onShare)) : ke(l, t.onExit) : Jt(l.child, !1)), mt !== null && _f(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Ef(l), l = l.sibling;
    else
      mt !== null && _f(l);
  }
  function hr(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = ua(t, l.stateNode);
        t = na(t.default, t.update), l.flags &= -5, t !== "none" && Ve(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && hr(l);
      l = l.sibling;
    }
  }
  function zf(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, Jt(l.child, !1));
          }
          zf(l);
        }
        l = l.sibling;
      }
  }
  function si(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, Jt(l.child, !1), zf(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        si(l), l = l.sibling;
    else zf(l);
  }
  function yr(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? Jt(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && yr(l), l = l.sibling;
  }
  function Nf(l, t, a, e, u, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && lt < n.length) {
          var v = n[lt], S = as(f);
          (v.view || S.view) && (c = !0);
          var E;
          if (E = (l.flags & 4) === 0)
            if (S.clip) E = !0;
            else {
              E = v.rect;
              var r = S.rect;
              E = E.y !== r.y || E.x !== r.x || E.height !== r.height || E.width !== r.width;
            }
          E && (l.flags |= 4), S.abs ? S = !v.abs : (v = v.rect, S = S.rect, S = v.height !== S.height || v.width !== S.width), S && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && m0(
          f,
          lt === 0 ? a : a + "_" + lt,
          u
        ), c && (l.flags & 4) !== 0 || (Kt === null && (Kt = []), Kt.push(
          f,
          lt === 0 ? e : e + "_" + lt,
          t.memoizedProps
        )), lt++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : Nf(
        l,
        t.child,
        a,
        e,
        u,
        n,
        i
      ) && (c = !0));
      t = t.sibling;
    }
    return c;
  }
  function gr(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, e = l.stateNode, u = ua(a, e), n = na(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, e = l;
        var c = l.child;
        lt = 0, u = Nf(
          e,
          c,
          u,
          u,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && u && ke(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && gr(l);
      l = l.sibling;
    }
  }
  var Hl = !1, cl = !1, wt = !1, Of = !1, Sr = typeof WeakSet == "function" ? WeakSet : Set, Bl = null, Ft = !1, Qu = !1, oi = !1, Af = !1;
  function Lv(l, t, a) {
    if (l = l.containerInfo, kf = cu, l = Eo(l), dc(l)) {
      if ("selectionStart" in l)
        var e = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          e = (e = l.ownerDocument) && e.defaultView || window;
          var u = e.getSelection && e.getSelection();
          if (u && u.rangeCount !== 0) {
            e = u.anchorNode;
            var n = u.anchorOffset, i = u.focusNode;
            u = u.focusOffset;
            try {
              e.nodeType, i.nodeType;
            } catch {
              e = null;
              break l;
            }
            var c = 0, f = -1, v = -1, S = 0, E = 0, r = l, g = null;
            t: for (; ; ) {
              for (var O; r !== e || n !== 0 && r.nodeType !== 3 || (f = c + n), r !== i || u !== 0 && r.nodeType !== 3 || (v = c + u), r.nodeType === 3 && (c += r.nodeValue.length), (O = r.firstChild) !== null; )
                g = r, r = O;
              for (; ; ) {
                if (r === l) break t;
                if (g === e && ++S === n && (f = c), g === i && ++E === u && (v = c), (O = r.nextSibling) !== null) break;
                r = g, g = r.parentNode;
              }
              r = O;
            }
            e = f === -1 || v === -1 ? null : { start: f, end: v };
          } else e = null;
        }
      e = e || { start: 0, end: 0 };
    } else e = null;
    for (If = { focusedElem: l, selectionRange: e }, cu = !1, a = (a & 335544064) === a, Bl = t, t = a ? 9270 : 1024; Bl !== null; ) {
      if (l = Bl, a && (e = l.deletions, e !== null))
        for (n = 0; n < e.length; n++)
          a && Ef(e[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && rr(l), di(a);
      else {
        if (l.tag === 22) {
          if (e = l.alternate, l.memoizedState !== null) {
            e !== null && e.memoizedState === null && a && Ef(e), di(a);
            continue;
          } else if (e !== null && e.memoizedState !== null) {
            a && rr(l), di(a);
            continue;
          }
        }
        e = l.child, (l.subtreeFlags & t) !== 0 && e !== null ? (e.return = l, Bl = e) : (a && hr(l), di(a));
      }
    }
    mt = null;
  }
  function di(l) {
    for (; Bl !== null; ) {
      var t = Bl, a = l, e = t.alternate, u = t.flags;
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((u & 1024) !== 0 && e !== null) {
            a = void 0, u = e.memoizedProps, e = e.memoizedState;
            var n = t.stateNode;
            try {
              var i = re(
                t.type,
                u
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                e
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              ol(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((u & 1024) !== 0) {
            if (e = t.stateNode.containerInfo, a = e.nodeType, a === 9)
              ns(e);
            else if (a === 1)
              switch (e.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  ns(e);
                  break;
                default:
                  e.textContent = "";
              }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          a && e !== null && (a = ua(
            e.memoizedProps,
            e.stateNode
          ), u = t.memoizedProps, u = na(u.default, u.update), u !== "none" && Ve(
            e,
            a,
            u,
            e.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((u & 1024) !== 0) throw Error(h(163));
      }
      if (e = t.sibling, e !== null) {
        e.return = t.return, Bl = e;
        break;
      }
      Bl = t.return;
    }
  }
  function br(l, t, a) {
    var e = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        $t(l, a), e & 4 && Gu(5, a);
        break;
      case 1:
        if ($t(l, a), e & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              ol(a, a.return, i);
            }
          else {
            var u = re(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              l.componentDidUpdate(
                u,
                t,
                l.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              ol(
                a,
                a.return,
                i
              );
            }
          }
        e & 64 && cr(a), e & 512 && Lt(a, a.return);
        break;
      case 3:
        if ($t(l, a), e & 64 && (l = a.updateQueue, l !== null)) {
          if (t = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            Wo(l, t);
          } catch (i) {
            ol(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && e & 4 && dr(a);
      case 26:
      case 5:
        $t(l, a), t === null && e & 4 && yf(a), e & 512 && Lt(a, a.return);
        break;
      case 12:
        $t(l, a);
        break;
      case 31:
        $t(l, a), e & 4 && zr(l, a);
        break;
      case 13:
        $t(l, a), e & 4 && Nr(l, a), e & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = ah.bind(
          null,
          a
        ), qh(l, a))));
        break;
      case 22:
        if (e = a.memoizedState !== null || Hl, !e) {
          var n = t !== null && t.memoizedState !== null || cl;
          t = Hl, u = cl, Hl = e, (cl = n) && !u ? (e = 2, (a.subtreeFlags & 8772) !== 0 && (e |= 1), pt(
            l,
            a,
            e
          )) : $t(l, a), Hl = t, cl = u;
        }
        break;
      case 30:
        $t(l, a), e & 512 && Lt(a, a.return);
        break;
      case 7:
        e & 512 && Lt(a, a.return);
      default:
        $t(l, a);
    }
  }
  function Df(l, t) {
    for (l = l.child; l !== null; )
      Tr(l, t), l = l.sibling;
  }
  function Tr(l, t) {
    switch (l.tag) {
      case 5:
      case 26:
        try {
          var a = l.stateNode;
          if (t) {
            var e = a.style;
            typeof e.setProperty == "function" ? e.setProperty("display", "none", "important") : e.display = "none";
          } else {
            var u = l.stateNode, n = l.memoizedProps.style, i = n != null && n.hasOwnProperty("display") ? n.display : null;
            u.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (f) {
          ol(l, l.return, f);
        }
        Mf(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, al = !0;
        } catch (f) {
          ol(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? r0(c, !0) : r0(l.stateNode, !1);
        } catch (f) {
          ol(l, l.return, f);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Df(l, t);
        break;
      default:
        Df(l, t);
    }
  }
  function Mf(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, e = t;
          switch (a.tag) {
            case 4:
              Tr(a, e);
              break l;
            case 22:
              a.memoizedState === null && Mf(a, e);
              break l;
            default:
              Mf(a, e);
          }
        }
        l = l.sibling;
      }
  }
  function _r(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, _r(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && yn(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var El = null, tt = !1;
  function jt(l, t, a) {
    for (a = a.child; a !== null; )
      Er(l, t, a), a = a.sibling;
  }
  function Er(l, t, a) {
    if (ft && typeof ft.onCommitFiberUnmount == "function")
      try {
        ft.onCommitFiberUnmount(ou, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        cl || Zl(a, t), jt(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !cl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        cl || Zl(a, t), Xu(a);
        var e = El, u = tt;
        Xa(a.type) && (El = a.stateNode, tt = !1), jt(
          l,
          t,
          a
        ), A0(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), El = e, tt = u;
        break;
      case 5:
        cl || Zl(a, t), Xu(a);
      case 6:
        if (a.tag === 6 && Xu(a), e = El, u = tt, El = null, jt(
          l,
          t,
          a
        ), El = e, tt = u, El !== null)
          if (tt)
            try {
              (El.nodeType === 9 ? El.body : El.nodeName === "HTML" ? El.ownerDocument.body : El).removeChild(a.stateNode), al = !0;
            } catch (n) {
              ol(
                a,
                t,
                n
              );
            }
          else
            try {
              El.removeChild(a.stateNode), al = !0;
            } catch (n) {
              ol(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        El !== null && (tt ? (l = El, d0(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), fu(l)) : d0(El, a.stateNode));
        break;
      case 4:
        e = El, u = tt, El = a.stateNode.containerInfo, tt = !0, jt(
          l,
          t,
          a
        ), El = e, tt = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        pa(2, a, t), cl || pa(4, a, t), jt(
          l,
          t,
          a
        );
        break;
      case 1:
        cl || (Zl(a, t), e = a.stateNode, typeof e.componentWillUnmount == "function" && fr(
          a,
          t,
          e
        )), jt(
          l,
          t,
          a
        );
        break;
      case 21:
        jt(
          l,
          t,
          a
        );
        break;
      case 22:
        cl = (e = cl) || a.memoizedState !== null, jt(
          l,
          t,
          a
        ), cl = e;
        break;
      case 30:
        Zl(a, t), jt(
          l,
          t,
          a
        );
        break;
      case 7:
        cl || Zl(a, t), jt(
          l,
          t,
          a
        );
        break;
      default:
        jt(
          l,
          t,
          a
        );
    }
  }
  function zr(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        fu(l);
      } catch (a) {
        ol(t, t.return, a);
      }
    }
  }
  function Nr(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        fu(l);
      } catch (a) {
        ol(t, t.return, a);
      }
  }
  function Kv(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new Sr()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new Sr()), t;
      default:
        throw Error(h(435, l.tag));
    }
  }
  function ri(l, t) {
    var a = Kv(l);
    t.forEach(function(e) {
      if (!a.has(e)) {
        a.add(e);
        var u = eh.bind(null, l, e);
        e.then(u, u);
      }
    });
  }
  function Wl(l, t, a) {
    var e = t.deletions;
    if (e !== null)
      for (var u = 0; u < e.length; u++) {
        var n = e[u], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Xa(f.type)) {
                El = f.stateNode, tt = !1;
                break l;
              }
              break;
            case 5:
              El = f.stateNode, tt = !1;
              break l;
            case 3:
            case 4:
              El = f.stateNode.containerInfo, tt = !0;
              break l;
          }
          f = f.return;
        }
        if (El === null) throw Error(h(160));
        Er(i, c, n), El = null, tt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Or(t, l, a), t = t.sibling;
  }
  var Ut = null;
  function Or(l, t, a) {
    var e = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (u & 4 && (e = l.updateQueue, e = e !== null ? e.events : null, e !== null))
          for (var n = 0; n < e.length; n++) {
            var i = e[n];
            i.ref.impl = i.nextImpl;
          }
        Wl(t, l, a), kl(l), u & 4 && (pa(3, l, l.return), Gu(3, l), pa(5, l, l.return));
        break;
      case 1:
        Wl(t, l, a), kl(l), u & 512 && (cl || e === null || Zl(e, e.return)), u & 64 && Hl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Ut, Wl(t, l, a), kl(l), u & 512 && (cl || e === null || Zl(e, e.return)), u & 4)
          if (u = e !== null ? e.memoizedState : null, a = l.memoizedState, e === null)
            if (a === null)
              if (l.stateNode === null)
                if (Hl)
                  l.stateNode = f0(
                    l.type,
                    l.memoizedProps,
                    t.containerInfo,
                    l
                  );
                else {
                  l: {
                    t = l.type, a = l.memoizedProps, u = n.ownerDocument || n;
                    t: switch (t) {
                      case "title":
                        e = u.getElementsByTagName("title")[0], (!e || e[mu] || e[Yl] || e.namespaceURI === "http://www.w3.org/2000/svg" || e.hasAttribute("itemprop")) && (e = u.createElement(t), u.head.insertBefore(
                          e,
                          u.querySelector("head > title")
                        )), Vl(e, t, a), e[Yl] = l, pl(e), t = e;
                        break l;
                      case "link":
                        if (n = U0(
                          "link",
                          "href",
                          u
                        ).get(t + (a.href || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && e.getAttribute("rel") === (a.rel == null ? null : a.rel) && e.getAttribute("title") === (a.title == null ? null : a.title) && e.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        e = u.createElement(t), Vl(e, t, a), u.head.appendChild(e);
                        break;
                      case "meta":
                        if (n = U0(
                          "meta",
                          "content",
                          u
                        ).get(t + (a.content || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("content") === (a.content == null ? null : "" + a.content) && e.getAttribute("name") === (a.name == null ? null : a.name) && e.getAttribute("property") === (a.property == null ? null : a.property) && e.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && e.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        e = u.createElement(t), Vl(e, t, a), u.head.appendChild(e);
                        break;
                      default:
                        throw Error(h(468, t));
                    }
                    e[Yl] = l, pl(e), t = e;
                  }
                  l.stateNode = t;
                }
              else
                Hl || rs(n, l.type, l.stateNode);
            else
              l.stateNode = j0(
                n,
                a,
                l.memoizedProps
              );
          else
            u !== a ? (u === null ? (t = e.stateNode, t === null || cl || t.parentNode.removeChild(t)) : u.count--, a === null ? Hl || rs(n, l.type, l.stateNode) : j0(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && gf(
              l,
              l.memoizedProps,
              e.memoizedProps
            );
        break;
      case 27:
        Wl(t, l, a), kl(l), u & 512 && (cl || e === null || Zl(e, e.return)), e !== null && u & 4 && gf(
          l,
          l.memoizedProps,
          e.memoizedProps
        );
        break;
      case 5:
        if (n = wt, wt = !1, Wl(t, l, a), wt = n, kl(l), u & 512 && (cl || e === null || Zl(e, e.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Oe(t, ""), al = !0;
          } catch (S) {
            ol(l, l.return, S);
          }
        }
        u & 4 && l.stateNode != null && (t = l.memoizedProps, gf(
          l,
          t,
          e !== null ? e.memoizedProps : t
        )), u & 1024 && (Of = !0);
        break;
      case 6:
        if (Wl(t, l, a), kl(l), u & 4) {
          if (l.stateNode === null)
            throw Error(h(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, al = !0;
          } catch (S) {
            ol(l, l.return, S);
          }
        }
        break;
      case 3:
        if (al = !1, Di = null, n = Ut, Ut = Wu(t.containerInfo), Wl(t, l, a), Ut = n, kl(l), u & 4 && e !== null && e.memoizedState.isDehydrated)
          try {
            fu(t.containerInfo);
          } catch (S) {
            ol(l, l.return, S);
          }
        Of && (Of = !1, Ar(l)), al = !1;
        break;
      case 4:
        u = wt, wt = Hl, e = Ks(), n = Ut, Ut = Wu(
          l.stateNode.containerInfo
        ), Wl(t, l, a), kl(l), Ut = n, al && Qu && (oi = !0), al = e, wt = u;
        break;
      case 12:
        Wl(t, l, a), kl(l);
        break;
      case 31:
        Wl(t, l, a), kl(l), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, ri(l, t)));
        break;
      case 13:
        Wl(t, l, a), kl(l), l.child.flags & 8192 && l.memoizedState !== null != (e !== null && e.memoizedState !== null) && (hi = ct()), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, ri(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = e !== null && e.memoizedState !== null;
        var c = Hl, f = cl, v = wt;
        Hl = c || n, wt = v || n, cl = f || i, Wl(t, l, a), cl = f, wt = v, Hl = c, kl(l), u & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || e === null || i || Hl || cl || (t = i || cl, a = Hl, e = cl, Hl = n || Hl, cl = t, Ra(l, 2), Hl = a, cl = e), !n && wt || Df(l, n)), u & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, ri(l, a))));
        break;
      case 19:
        Wl(t, l, a), kl(l), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, ri(l, t)));
        break;
      case 30:
        u & 512 && (cl || e === null || Zl(e, e.return)), u = Ks(), n = Qu, i = (a & 335544064) === a, c = l.memoizedProps, Qu = i && na(
          c.default,
          c.update
        ) !== "none", Wl(t, l, a), kl(l), i && e !== null && al && (l.flags |= 4), Qu = n, al = u;
        break;
      case 21:
        break;
      case 7:
        u & 512 && (cl || e === null || Zl(e, e.return)), e && e.stateNode !== null && (e.stateNode._fragmentFiber = l);
      default:
        Wl(t, l, a), kl(l);
    }
  }
  function kl(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, e = l.return; e !== null; ) {
          if (or(e)) {
            a = e;
            break;
          }
          e = e.return;
        }
        e = null;
        for (var u = l.return; u !== null; ) {
          if (hf(u)) {
            var n = u.stateNode;
            e === null ? e = [n] : e.push(n);
          }
          if (vf(u)) break;
          u = u.return;
        }
        var i = e;
        if (a == null) throw Error(h(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = Sf(l);
            ii(
              l,
              f,
              c,
              i
            );
            break;
          case 5:
            var v = a.stateNode;
            a.flags & 32 && (Oe(v, ""), a.flags &= -33);
            var S = Sf(l);
            ii(
              l,
              S,
              v,
              i
            );
            break;
          case 3:
          case 4:
            var E = a.stateNode.containerInfo, r = Sf(l);
            bf(
              l,
              r,
              E,
              i
            );
            break;
          default:
            throw Error(h(161));
        }
      } catch (g) {
        ol(l, l.return, g);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Ar(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Ar(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, cu = !0, t.reset(), cu = !1), l = l.sibling;
      }
  }
  function Le(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Dr(t, l), t = t.sibling;
    else gr(t);
  }
  function Dr(l, t) {
    var a = l.alternate;
    if (a === null) Tf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Af = Ft = !1, mr(), Le(t, l), !Ft && !oi) {
            if (l = Kt, l !== null)
              for (var e = 0; e < l.length; e += 3) {
                a = l[e];
                var u = l[e + 1];
                v0(a, l[e + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + u + ")"
                  }
                );
              }
            l = t.containerInfo, l = l.nodeType === 9 ? l.documentElement : l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "" && (l.style.viewTransitionName = "none", l.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), l.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            )), Af = !0;
          }
          Kt = null;
          break;
        case 5:
          Le(t, l);
          break;
        case 4:
          e = Ft, Ft = !1, Le(t, l), Ft && (oi = !0), Ft = e;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? Tf(l, !1) : Le(t, l));
          break;
        case 30:
          e = Ft, u = mr(), Ft = !1, Le(t, l), Ft && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ua(n, i), i = ua(a.memoizedProps, i);
          var c = na(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, lt = 0, t = Nf(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), lt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (ke(
            l,
            l.memoizedProps.onUpdate
          ), Kt = u) : u !== null && (u.push.apply(u, Kt), Kt = u), Ft = (l.flags & 32) !== 0 ? !0 : e;
          break;
        default:
          Le(t, l);
      }
  }
  function $t(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        br(l, t.alternate, t), t = t.sibling;
  }
  function Ra(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, e = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          pa(4, a, a.return), Ra(
            a,
            e
          );
          break;
        case 1:
          Zl(a, a.return);
          var u = a.stateNode;
          typeof u.componentWillUnmount == "function" && fr(
            a,
            a.return,
            u
          ), Ra(
            a,
            e
          );
          break;
        case 27:
          (e & 2) !== 0 && A0(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          Zl(a, a.return), a.tag !== 5 && a.tag !== 27 || Xu(a), Ra(
            a,
            e
          );
          break;
        case 6:
          Xu(a);
          break;
        case 26:
          Zl(a, a.return), u = a.stateNode, a.memoizedState !== null || u === null || cl || u.parentNode.removeChild(u), Ra(
            a,
            e
          );
          break;
        case 22:
          a.memoizedState === null && Ra(
            a,
            e
          );
          break;
        case 30:
          Zl(a, a.return), Ra(
            a,
            e
          );
          break;
        case 7:
          Zl(a, a.return);
        default:
          Ra(
            a,
            e
          );
      }
      l = l.sibling;
    }
  }
  function pt(l, t, a) {
    for (a = (t.subtreeFlags & 8772) !== 0 ? a : a & -2, t = t.child; t !== null; ) {
      var e = t.alternate, u = l, n = t, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          pt(
            u,
            n,
            a
          ), Gu(4, n);
          break;
        case 1:
          if (pt(
            u,
            n,
            a
          ), e = n, u = e.stateNode, typeof u.componentDidMount == "function")
            try {
              u.componentDidMount();
            } catch (S) {
              ol(e, e.return, S);
            }
          if (e = n, u = e.updateQueue, u !== null) {
            var f = e.stateNode;
            try {
              var v = u.shared.hiddenCallbacks;
              if (v !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < v.length; u++)
                  $o(v[u], f);
            } catch (S) {
              ol(e, e.return, S);
            }
          }
          c && i & 64 && cr(n), Lt(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && dr(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || sr(n), pt(
            u,
            n,
            a
          ), c && e === null && i & 4 && yf(n), Lt(n, n.return);
          break;
        case 6:
          sr(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || Hl || rs(
            Wu(f.ownerDocument),
            n.type,
            f
          ), pt(
            u,
            n,
            a
          ), c && e === null && i & 4 && yf(n), Lt(n, n.return);
          break;
        case 12:
          pt(
            u,
            n,
            a
          );
          break;
        case 31:
          pt(
            u,
            n,
            a
          ), c && i & 4 && zr(u, n);
          break;
        case 13:
          pt(
            u,
            n,
            a
          ), c && i & 4 && Nr(u, n);
          break;
        case 22:
          n.memoizedState === null && pt(
            u,
            n,
            a
          ), Lt(n, n.return);
          break;
        case 30:
          pt(
            u,
            n,
            a
          ), Lt(n, n.return);
          break;
        case 7:
          Lt(n, n.return);
        default:
          pt(
            u,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function xf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Au(a));
  }
  function Cf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Au(l));
  }
  function At(l, t, a, e) {
    var u = (a & 335544064) === a;
    if (t.subtreeFlags & (u ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Mr(
          l,
          t,
          a,
          e
        ), t = t.sibling;
    else u && yr(t);
  }
  function Mr(l, t, a, e) {
    var u = (a & 335544064) === a;
    u && t.alternate === null && t.return !== null && t.return.alternate !== null && si(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        At(
          l,
          t,
          a,
          e
        ), n & 2048 && Gu(9, t);
        break;
      case 1:
        At(
          l,
          t,
          a,
          e
        );
        break;
      case 3:
        At(
          l,
          t,
          a,
          e
        ), u && Af && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Au(n)));
        break;
      case 12:
        if (n & 2048) {
          At(
            l,
            t,
            a,
            e
          ), n = t.stateNode;
          try {
            var i = t.memoizedProps, c = i.id, f = i.onPostCommit;
            typeof f == "function" && f(
              c,
              t.alternate === null ? "mount" : "update",
              n.passiveEffectDuration,
              -0
            );
          } catch (v) {
            ol(t, t.return, v);
          }
        } else
          At(
            l,
            t,
            a,
            e
          );
        break;
      case 31:
        At(
          l,
          t,
          a,
          e
        );
        break;
      case 13:
        At(
          l,
          t,
          a,
          e
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (u && c !== null && c.memoizedState === null && si(c), i._visibility & 2 ? At(
          l,
          t,
          a,
          e
        ) : Zu(
          l,
          t
        )) : (u && c !== null && c.memoizedState !== null && si(t), i._visibility & 2 ? At(
          l,
          t,
          a,
          e
        ) : (i._visibility |= 2, Ke(
          l,
          t,
          a,
          e,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && xf(c, t);
        break;
      case 24:
        At(
          l,
          t,
          a,
          e
        ), n & 2048 && Cf(t.alternate, t);
        break;
      case 30:
        u && (n = t.alternate, n !== null && (Jt(n.child, !0), Jt(t.child, !0))), At(
          l,
          t,
          a,
          e
        );
        break;
      default:
        At(
          l,
          t,
          a,
          e
        );
    }
  }
  function Ke(l, t, a, e, u) {
    for (u = u && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, f = e, v = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          Ke(
            n,
            i,
            c,
            f,
            u
          ), Gu(8, i);
          break;
        case 23:
          break;
        case 22:
          var S = i.stateNode;
          i.memoizedState !== null ? S._visibility & 2 ? Ke(
            n,
            i,
            c,
            f,
            u
          ) : Zu(
            n,
            i
          ) : (S._visibility |= 2, Ke(
            n,
            i,
            c,
            f,
            u
          )), u && v & 2048 && xf(
            i.alternate,
            i
          );
          break;
        case 24:
          Ke(
            n,
            i,
            c,
            f,
            u
          ), u && v & 2048 && Cf(i.alternate, i);
          break;
        default:
          Ke(
            n,
            i,
            c,
            f,
            u
          );
      }
      t = t.sibling;
    }
  }
  function Zu(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, e = t, u = e.flags;
        switch (e.tag) {
          case 22:
            Zu(a, e), u & 2048 && xf(
              e.alternate,
              e
            );
            break;
          case 24:
            Zu(a, e), u & 2048 && Cf(e.alternate, e);
            break;
          default:
            Zu(a, e);
        }
        t = t.sibling;
      }
  }
  var me = 8192;
  function ve(l, t, a) {
    if (l.subtreeFlags & me)
      for (l = l.child; l !== null; )
        xr(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function xr(l, t, a) {
    switch (l.tag) {
      case 26:
        ve(
          l,
          t,
          a
        ), l.flags & me && (l.memoizedState !== null ? kh(
          a,
          Ut,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && B0(a, l)));
        break;
      case 5:
        ve(
          l,
          t,
          a
        ), l.flags & me && (l = l.stateNode, (t & 335544128) === t && B0(a, l));
        break;
      case 3:
      case 4:
        var e = Ut;
        Ut = Wu(l.stateNode.containerInfo), ve(
          l,
          t,
          a
        ), Ut = e;
        break;
      case 22:
        l.memoizedState === null && (e = l.alternate, e !== null && e.memoizedState !== null ? (e = me, me = 16777216, ve(
          l,
          t,
          a
        ), me = e) : ve(
          l,
          t,
          a
        ));
        break;
      case 30:
        if ((l.flags & me) !== 0 && (e = l.memoizedProps.name, e != null && e !== "auto")) {
          var u = l.stateNode;
          u.paired = null, mt === null && (mt = /* @__PURE__ */ new Map()), mt.set(e, u);
        }
        ve(
          l,
          t,
          a
        );
        break;
      default:
        ve(
          l,
          t,
          a
        );
    }
  }
  function Cr(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Vu(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var e = t[a];
          Bl = e, Ur(
            e,
            l
          );
        }
      Cr(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        jr(l), l = l.sibling;
  }
  function jr(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Vu(l), l.flags & 2048 && pa(9, l, l.return);
        break;
      case 3:
        Vu(l);
        break;
      case 12:
        Vu(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, mi(l)) : Vu(l);
        break;
      default:
        Vu(l);
    }
  }
  function mi(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var e = t[a];
          Bl = e, Ur(
            e,
            l
          );
        }
      Cr(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          pa(8, t, t.return), mi(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, mi(t));
          break;
        default:
          mi(t);
      }
      l = l.sibling;
    }
  }
  function Ur(l, t) {
    for (; Bl !== null; ) {
      var a = Bl;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          pa(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var e = a.memoizedState.cachePool.pool;
            e != null && e.refCount++;
          }
          break;
        case 24:
          Au(a.memoizedState.cache);
      }
      if (e = a.child, e !== null) e.return = a, Bl = e;
      else
        l: for (a = l; Bl !== null; ) {
          e = Bl;
          var u = e.sibling, n = e.return;
          if (_r(e), e === a) {
            Bl = null;
            break l;
          }
          if (u !== null) {
            u.return = n, Bl = u;
            break l;
          }
          Bl = n;
        }
    }
  }
  var Jv = {
    getCacheForType: function(l) {
      var t = Gl(Dl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Gl(Dl).controller.signal;
    }
  }, wv = typeof WeakMap == "function" ? WeakMap : Map, nl = 0, yl = null, F = null, W = 0, sl = 0, vt = null, Ha = !1, Je = !1, jf = !1, va = 0, Ol = 0, Ba = 0, he = 0, vi = 0, ht = 0, we = 0, Lu = null, at = null, Uf = !1, hi = 0, pr = 0, yi = 1 / 0, gi = null, qa = null, zl = 0, Rt = null, ye = null, Wt = 0, pf = 0, Rf = null, Rr = null, Fe = null, $e = null, We = null, Ku = 0, Si = null;
  function yt() {
    return (nl & 2) !== 0 && W !== 0 ? W & -W : j.T !== null ? Lf() : Bs();
  }
  function Hr() {
    if (ht === 0)
      if ((W & 536870912) === 0 || K) {
        var l = rn;
        rn <<= 1, (rn & 3932160) === 0 && (rn = 262144), ht = l;
      } else ht = 536870912;
    return l = Xl.current, l !== null && (l.flags |= 32), ht;
  }
  function ke(l, t) {
    if (t != null) {
      var a = l.stateNode, e = a.ref;
      e === null && (e = a.ref = h0(
        ua(l.memoizedProps, a)
      )), $e === null && ($e = []), $e.push(t.bind(null, e));
    }
  }
  function et(l, t, a) {
    (l === yl && (sl === 2 || sl === 9) || l.cancelPendingCommit !== null) && (Ie(l, 0), Ya(
      l,
      W,
      ht,
      !1
    )), ru(l, a), ((nl & 2) === 0 || l !== yl) && (l === yl && ((nl & 2) === 0 && (he |= a), Ol === 4 && Ya(
      l,
      W,
      ht,
      !1
    )), kt(l));
  }
  function Br(l, t, a) {
    if ((nl & 6) !== 0) throw Error(h(327));
    var e = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || du(l, t), u = e ? Wv(l, t) : Bf(l, t, !0), n = e;
    do {
      if (u === 0) {
        Je && !e && Ya(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Fv(a)) {
          u = Bf(l, t, !1), n = !1;
          continue;
        }
        if (u === 2) {
          if (n = t, l.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = l.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            t = i;
            l: {
              var c = l;
              u = Lu;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (Ie(c, i).flags |= 256), i = Bf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (jf && !f) {
                  c.errorRecoveryDisabledLanes |= n, he |= n, u = 4;
                  break l;
                }
                n = at, at = u, n !== null && (at === null ? at = n : at.push.apply(
                  at,
                  n
                ));
              }
              u = i;
            }
            if (n = !1, u !== 2) continue;
          }
        }
        if (u === 1) {
          Ie(l, 0), Ya(l, t, 0, !0);
          break;
        }
        l: {
          switch (e = l, n = u, n) {
            case 0:
            case 1:
              throw Error(h(345));
            case 4:
              if ((t & 4194048) !== t && (t & 62914560) !== t)
                break;
            case 6:
              Ya(
                e,
                t,
                ht,
                !Ha
              );
              break l;
            case 2:
              at = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(h(329));
          }
          if ((t & 62914560) === t && (u = hi + 300 - ct(), 10 < u)) {
            if (Ya(
              e,
              t,
              ht,
              !Ha
            ), vn(e, 0, !0) !== 0) break l;
            Wt = t, e.timeoutHandle = ts(
              qr.bind(
                null,
                e,
                a,
                at,
                gi,
                Uf,
                t,
                ht,
                he,
                we,
                Ha,
                n,
                "Throttled",
                -0,
                0
              ),
              u
            );
            break l;
          }
          qr(
            e,
            a,
            at,
            gi,
            Uf,
            t,
            ht,
            he,
            we,
            Ha,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    kt(l);
  }
  function qr(l, t, a, e, u, n, i, c, f, v, S, E, r, g) {
    l.timeoutHandle = -1;
    var O = t.subtreeFlags, C = (n & 335544064) === n;
    if (E = null, (C || O & 8192 || (O & 16785408) === 16785408) && (E = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Qt
    }, mt = null, xr(
      t,
      n,
      E
    ), C && (O = E, C = l.containerInfo, C = (C.nodeType === 9 ? C : C.ownerDocument).__reactViewTransition, C != null && (O.count++, O.waitingForViewTransition = !0, O = Pu.bind(O), C.finished.then(O, O))), O = (n & 62914560) === n ? hi - ct() : (n & 4194048) === n ? pr - ct() : 0, O = Ih(
      E,
      O
    ), O !== null)) {
      Wt = n, l.cancelPendingCommit = O(
        Kr.bind(
          null,
          l,
          t,
          n,
          a,
          e,
          u,
          i,
          c,
          f,
          v,
          S,
          E,
          null,
          r,
          g
        )
      ), Ya(l, n, i, !v);
      return;
    }
    Kr(
      l,
      t,
      n,
      a,
      e,
      u,
      i,
      c,
      f,
      v,
      S,
      E
    );
  }
  function Fv(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var e = 0; e < a.length; e++) {
          var u = a[e], n = u.getSnapshot;
          u = u.value;
          try {
            if (!dt(n(), u)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = t.child, t.subtreeFlags & 16384 && a !== null)
        a.return = t, t = a;
      else {
        if (t === l) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function Ya(l, t, a, e) {
    t = js(l, t), t &= ~vi, t &= ~he, l.suspendedLanes |= t, l.pingedLanes &= ~t, e && (l.warmLanes |= t), e = l.expirationTimes;
    for (var u = t; 0 < u; ) {
      var n = 31 - st(u), i = 1 << n;
      e[n] = -1, u &= ~i;
    }
    a !== 0 && ps(l, a, t);
  }
  function bi() {
    return (nl & 6) === 0 ? (Ju(0), !1) : !0;
  }
  function Hf() {
    if (F !== null) {
      if (sl === 0)
        var l = F.return;
      else
        l = F, fa = ee = null, Zc(l), Ye = null, xu = 0, l = F;
      for (; l !== null; )
        ir(l.alternate, l), l = l.return;
      F = null;
    }
  }
  function Ie(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, Sh(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), Wt = 0, Hf(), yl = l, F = a = ia(l.current, null), W = t, sl = 0, vt = null, Ha = !1, Je = du(l, t), jf = !1, we = ht = vi = he = Ba = Ol = 0, at = Lu = null, Uf = !1, va = js(l, t), Dn(), a;
  }
  function Yr(l, t) {
    V = null, j.H = In, t === qe || t === Yn ? (t = Ko(), sl = 3) : t === xc ? (t = Ko(), sl = 4) : sl = t === ef ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, vt = t, F === null && (Ol = 1, Pn(
      l,
      Et(t, l.current)
    ));
  }
  function Gr() {
    var l = Xl.current;
    return l === null ? !0 : (W & 4194048) === W ? wl === null : (W & 62914560) === W || (W & 536870912) !== 0 ? l === wl : !1;
  }
  function Xr() {
    var l = j.H;
    return j.H = In, l === null ? In : l;
  }
  function Qr() {
    var l = j.A;
    return j.A = Jv, l;
  }
  function Ti() {
    Ol = 4, Ha || (W & 4194048) !== W && Xl.current !== null || (Je = !0), (Ba & 134217727) === 0 && (he & 134217727) === 0 || yl === null || Ya(
      yl,
      W,
      ht,
      !1
    );
  }
  function Bf(l, t, a) {
    var e = nl;
    nl |= 2;
    var u = Xr(), n = Qr();
    (yl !== l || W !== t) && (gi = null, Ie(l, t)), t = !1;
    var i = Ol;
    l: do
      try {
        if (sl !== 0 && F !== null) {
          var c = F, f = vt;
          switch (sl) {
            case 8:
              Hf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              Xl.current === null && (t = !0);
              var v = sl;
              if (sl = 0, vt = null, Pe(l, c, f, v), a && Je) {
                i = 0;
                break l;
              }
              break;
            default:
              v = sl, sl = 0, vt = null, Pe(l, c, f, v);
          }
        }
        $v(), i = Ol;
        break;
      } catch (S) {
        Yr(l, S);
      }
    while (!0);
    return t && l.shellSuspendCounter++, fa = ee = null, nl = e, j.H = u, j.A = n, F === null && (yl = null, W = 0, Dn()), i;
  }
  function $v() {
    for (; F !== null; ) Zr(F);
  }
  function Wv(l, t) {
    var a = nl;
    nl |= 2;
    var e = Xr(), u = Qr();
    yl !== l || W !== t ? (gi = null, yi = ct() + 500, Ie(l, t)) : Je = du(
      l,
      t
    );
    l: do
      try {
        if (sl !== 0 && F !== null) {
          t = F;
          var n = vt;
          t: switch (sl) {
            case 1:
              sl = 0, vt = null, Pe(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Vo(n)) {
                sl = 0, vt = null, Vr(t);
                break;
              }
              t = function() {
                sl !== 2 && sl !== 9 || yl !== l || (sl = 7), kt(l);
              }, n.then(t, t);
              break l;
            case 3:
              sl = 7;
              break l;
            case 4:
              sl = 5;
              break l;
            case 7:
              Vo(n) ? (sl = 0, vt = null, Vr(t)) : (sl = 0, vt = null, Pe(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (F.tag) {
                case 26:
                  i = F.memoizedState;
                case 5:
                case 27:
                  var c = F;
                  if (i ? R0(i) : c.stateNode.complete) {
                    sl = 0, vt = null;
                    var f = c.sibling;
                    if (f !== null) F = f;
                    else {
                      var v = c.return;
                      v !== null ? (F = v, _i(v)) : F = null;
                    }
                    break t;
                  }
              }
              sl = 0, vt = null, Pe(l, t, n, 5);
              break;
            case 6:
              sl = 0, vt = null, Pe(l, t, n, 6);
              break;
            case 8:
              Hf(), Ol = 6;
              break l;
            default:
              throw Error(h(462));
          }
        }
        kv();
        break;
      } catch (S) {
        Yr(l, S);
      }
    while (!0);
    return fa = ee = null, j.H = e, j.A = u, nl = a, F !== null ? 0 : (yl = null, W = 0, Dn(), Ol);
  }
  function kv() {
    for (; F !== null && !vm(); )
      Zr(F);
  }
  function Zr(l) {
    var t = ur(l.alternate, l, va);
    l.memoizedProps = l.pendingProps, t === null ? _i(l) : F = t;
  }
  function Vr(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = kd(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          W
        );
        break;
      case 11:
        t = kd(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          W
        );
        break;
      case 5:
        Zc(t);
        var e = t;
        e === Rl && (K ? (pn(e), e.tag === 5 && e.stateNode != null && (bl = e.stateNode)) : (pn(e), K = !0));
      default:
        ir(a, t), t = F = Uo(t, va), t = ur(a, t, va);
    }
    l.memoizedProps = l.pendingProps, t === null ? _i(l) : F = t;
  }
  function Pe(l, t, a, e) {
    fa = ee = null, Zc(t), Ye = null, xu = 0;
    var u = t.return;
    try {
      if (Yv(
        l,
        u,
        t,
        a,
        W
      )) {
        Ol = 1, Pn(
          l,
          Et(a, l.current)
        ), F = null;
        return;
      }
    } catch (n) {
      if (u !== null) throw F = u, n;
      Ol = 1, Pn(
        l,
        Et(a, l.current)
      ), F = null;
      return;
    }
    t.flags & 32768 ? (K || e === 1 ? l = !0 : Je || (W & 536870912) !== 0 ? l = !1 : (Ha = l = !0, (e === 2 || e === 9 || e === 3 || e === 6) && (e = Xl.current, e !== null && e.tag === 13 && (e.flags |= 16384))), Lr(t, l)) : _i(t);
  }
  function _i(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        Lr(
          t,
          Ha
        );
        return;
      }
      l = t.return;
      var a = Zv(
        t.alternate,
        t,
        va
      );
      if (a !== null) {
        F = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        F = t;
        return;
      }
      F = t = l;
    } while (t !== null);
    Ol === 0 && (Ol = 5);
  }
  function Lr(l, t) {
    do {
      var a = Vv(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, F = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        F = l;
        return;
      }
      F = l = a;
    } while (l !== null);
    Ol = 6, F = null;
  }
  function Kr(l, t, a, e, u, n, i, c, f, v, S, E) {
    l.cancelPendingCommit = null;
    do
      Ei();
    while (zl !== 0);
    if ((nl & 6) !== 0) throw Error(h(327));
    if (t !== null) {
      if (t === l.current) throw Error(h(177));
      l === yl && (F = yl = null, W = 0), ye = t, Rt = l, Wt = a, Rf = u, Rr = e, Iv(
        l,
        t,
        a,
        i,
        c,
        f,
        E
      );
    }
  }
  function Iv(l, t, a, e, u, n, i) {
    var c = t.lanes | t.childLanes;
    if (pf = c, c |= yc, Nm(
      l,
      a,
      c,
      e,
      u,
      n
    ), $e = null, (a & 335544064) === a ? (We = Av(l), e = 10262) : (We = null, e = 10256), (t.subtreeFlags & e) !== 0 || (t.flags & e) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, uh(on, function() {
      return Xf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), ci = !1, e = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || e) {
      e = j.T, j.T = null, u = X.p, X.p = 2, n = nl, nl |= 4;
      try {
        Lv(l, t, a);
      } finally {
        nl = n, X.p = u, j.T = e;
      }
    }
    zl = 1, ci ? Fe = Nh(
      i,
      l.containerInfo,
      We,
      qf,
      Yf,
      lh,
      Gf,
      Xf,
      Pv
    ) : (qf(), Yf(), Gf());
  }
  function Pv(l) {
    if (zl !== 0) {
      var t = Rt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function lh() {
    zl === 3 && (zl = 0, Dr(ye, Rt), zl = 4);
  }
  function qf() {
    if (zl === 1) {
      zl = 0;
      var l = Rt, t = ye, a = Wt, e = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || e) {
        e = j.T, j.T = null;
        var u = X.p;
        X.p = 2;
        var n = nl;
        nl |= 4;
        try {
          Qu = oi = !1, Or(t, l, a), a = If;
          var i = Eo(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && _o(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && dc(c)) {
              var v = f.start, S = f.end;
              if (S === void 0 && (S = v), "selectionStart" in c)
                c.selectionStart = v, c.selectionEnd = Math.min(
                  S,
                  c.value.length
                );
              else {
                var E = c.ownerDocument || document, r = E && E.defaultView || window;
                if (r.getSelection) {
                  var g = r.getSelection(), O = c.textContent.length, C = Math.min(f.start, O), L = f.end === void 0 ? C : Math.min(f.end, O);
                  !g.extend && C > L && (i = L, L = C, C = i);
                  var m = To(
                    c,
                    C
                  ), s = To(
                    c,
                    L
                  );
                  if (m && s && (g.rangeCount !== 1 || g.anchorNode !== m.node || g.anchorOffset !== m.offset || g.focusNode !== s.node || g.focusOffset !== s.offset)) {
                    var y = E.createRange();
                    y.setStart(m.node, m.offset), g.removeAllRanges(), C > L ? (g.addRange(y), g.extend(s.node, s.offset)) : (y.setEnd(s.node, s.offset), g.addRange(y));
                  }
                }
              }
            }
            for (E = [], g = c; g = g.parentNode; )
              g.nodeType === 1 && E.push({
                element: g,
                left: g.scrollLeft,
                top: g.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < E.length; c++) {
              var _ = E[c];
              _.element.scrollLeft = _.left, _.element.scrollTop = _.top;
            }
          }
          cu = !!kf, If = kf = null;
        } finally {
          nl = n, X.p = u, j.T = e;
        }
      }
      l.current = t, zl = 2;
    }
  }
  function Yf() {
    if (zl === 2) {
      zl = 0;
      var l = Rt, t = ye, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = j.T, j.T = null;
        var e = X.p;
        X.p = 2;
        var u = nl;
        nl |= 4;
        try {
          br(l, t.alternate, t);
        } finally {
          nl = u, X.p = e, j.T = a;
        }
      }
      zl = 3;
    }
  }
  function Gf() {
    if (zl === 4 || zl === 3) {
      zl = 0;
      var l = Fe;
      Fe = null, hm();
      var t = Rt, a = ye, e = Wt, u = Rr, n = (e & 335544064) === e ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? zl = 5 : (zl = 0, ye = Rt = null, Jr(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (qa = null), wi(e), a = a.stateNode, ft && typeof ft.onCommitFiberRoot == "function")
        try {
          ft.onCommitFiberRoot(
            ou,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        a = j.T, n = X.p, X.p = 2, j.T = null;
        try {
          for (var i = t.onRecoverableError, c = 0; c < u.length; c++) {
            var f = u[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          j.T = a, X.p = n;
        }
      }
      if (u = $e, i = We, We = null, u !== null && ($e = null, i === null && (i = []), l !== null))
        for (f = 0; f < u.length; f++)
          a = (0, u[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (Wt & 3) !== 0 && Ei(), kt(t), n = t.pendingLanes, (e & 261930) !== 0 && (n & 42) !== 0 ? t === Si ? Ku++ : (Ku = 0, Si = t) : (Ku = 0, Si = null), Ju(0);
    }
  }
  function Jr(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Au(t)));
  }
  function Ei() {
    return Fe !== null && (Fe.skipTransition(), Fe = null), qf(), Yf(), Gf(), Xf();
  }
  function Xf() {
    if (zl !== 5) return !1;
    var l = Rt, t = pf;
    pf = 0;
    var a = wi(Wt), e = j.T, u = X.p;
    try {
      X.p = 32 > a ? 32 : a, j.T = null, a = Rf, Rf = null;
      var n = Rt, i = Wt;
      if (zl = 0, ye = Rt = null, Wt = 0, (nl & 6) !== 0) throw Error(h(331));
      var c = nl;
      if (nl |= 4, jr(n.current), Mr(
        n,
        n.current,
        i,
        a
      ), nl = c, Ju(0, !1), ft && typeof ft.onPostCommitFiberRoot == "function")
        try {
          ft.onPostCommitFiberRoot(ou, n);
        } catch {
        }
      return !0;
    } finally {
      X.p = u, j.T = e, Jr(l, t);
    }
  }
  function wr(l, t, a) {
    t = Et(a, t), t = af(l.stateNode, t, 2), l = xa(l, t, 2), l !== null && (ru(l, 2), kt(l));
  }
  function ol(l, t, a) {
    if (l.tag === 3)
      wr(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          wr(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var e = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof e.componentDidCatch == "function" && (qa === null || !qa.has(e))) {
            l = Et(a, l), a = Vd(2), e = xa(t, a, 2), e !== null && (Ld(
              a,
              e,
              t,
              l
            ), ru(e, 2), kt(e));
            break;
          }
        }
        t = t.return;
      }
  }
  function Qf(l, t, a) {
    var e = l.pingCache;
    if (e === null) {
      e = l.pingCache = new wv();
      var u = /* @__PURE__ */ new Set();
      e.set(t, u);
    } else
      u = e.get(t), u === void 0 && (u = /* @__PURE__ */ new Set(), e.set(t, u));
    u.has(a) || (jf = !0, u.add(a), l = th.bind(null, l, t, a), t.then(l, l));
  }
  function th(l, t, a) {
    var e = l.pingCache;
    e !== null && e.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, yl === l && (W & a) === a && ((Ol === 4 || Ol === 3 && (W & 62914560) === W && 300 > ct() - hi) && (nl & 2) === 0 ? Ie(l, 0) : vi |= a, we === W && (we = 0)), kt(l);
  }
  function Fr(l, t) {
    t === 0 && (t = Us()), l = le(l, t), l !== null && (ru(l, t), kt(l));
  }
  function ah(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), Fr(l, a);
  }
  function eh(l, t) {
    var a = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var e = l.stateNode, u = l.memoizedState;
        u !== null && (a = u.retryLane);
        break;
      case 19:
        e = l.stateNode;
        break;
      case 22:
        e = l.stateNode._retryCache;
        break;
      default:
        throw Error(h(314));
    }
    e !== null && e.delete(t), Fr(l, a);
  }
  function uh(l, t) {
    return Vi(l, t);
  }
  var lu = null, tu = null, Zf = !1, zi = !1, Vf = !1, Ga = 0;
  function kt(l) {
    l !== tu && l.next === null && (tu === null ? lu = tu = l : tu = tu.next = l), zi = !0, Zf || (Zf = !0, ih());
  }
  function Ju(l, t) {
    if (!Vf && zi) {
      Vf = !0;
      do
        for (var a = !1, e = lu; e !== null; ) {
          if (l !== 0) {
            var u = e.pendingLanes;
            if (u === 0) var n = 0;
            else {
              var i = e.suspendedLanes, c = e.pingedLanes;
              n = (1 << 31 - st(42 | l) + 1) - 1, n &= u & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, Ir(e, n));
          } else
            n = W, n = vn(
              e,
              e === yl ? n : 0,
              e.cancelPendingCommit !== null || e.timeoutHandle !== -1
            ), (n & 3) === 0 || du(e, n) || (a = !0, Ir(e, n));
          e = e.next;
        }
      while (a);
      Vf = !1;
    }
  }
  function nh() {
    $r();
  }
  function $r() {
    zi = Zf = !1;
    var l = 0;
    Ga !== 0 && gh() && (l = Ga);
    for (var t = ct(), a = null, e = lu; e !== null; ) {
      var u = e.next, n = Wr(e, t);
      n === 0 ? (e.next = null, a === null ? lu = u : a.next = u, u === null && (tu = a)) : (a = e, (l !== 0 || (n & 3) !== 0) && (zi = !0)), e = u;
    }
    zl !== 0 && zl !== 5 || Ju(l), Ga !== 0 && (Ga = 0);
  }
  function Wr(l, t) {
    for (var a = l.suspendedLanes, e = l.pingedLanes, u = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - st(n), c = 1 << i, f = u[i];
      f === -1 ? ((c & a) === 0 || (c & e) !== 0) && (u[i] = zm(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = yl, a = W, a = vn(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), e = l.callbackNode, a === 0 || l === t && (sl === 2 || sl === 9) || l.cancelPendingCommit !== null)
      return e !== null && e !== null && Li(e), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || du(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (e !== null && Li(e), wi(a)) {
        case 2:
        case 8:
          a = xs;
          break;
        case 32:
          a = on;
          break;
        case 268435456:
          a = Cs;
          break;
        default:
          a = on;
      }
      return e = kr.bind(null, l), a = Vi(a, e), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return e !== null && e !== null && Li(e), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function kr(l, t) {
    if (zl !== 0 && zl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (Ei() && l.callbackNode !== a)
      return null;
    var e = W;
    return e = vn(
      l,
      l === yl ? e : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), e === 0 ? null : (Br(l, e, t), Wr(l, ct()), l.callbackNode != null && l.callbackNode === a ? kr.bind(null, l) : null);
  }
  function Ir(l, t) {
    if (Ei()) return null;
    Br(l, t, !0);
  }
  function ih() {
    bh(function() {
      (nl & 6) !== 0 ? Vi(
        Ms,
        nh
      ) : $r();
    });
  }
  function Lf() {
    if (Ga === 0) {
      var l = ie;
      l === 0 && (l = dn, dn <<= 1, (dn & 261888) === 0 && (dn = 256)), Ga = l;
    }
    return Ga;
  }
  function Pr(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : bn(l);
  }
  function ch(l, t, a, e, u) {
    if (t === "submit" && a && a.stateNode === u) {
      var n = Pr(
        (u[Il] || null).action
      ), i = e.submitter;
      i && (t = (t = i[Il] || null) ? Pr(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new zn(
        "action",
        "action",
        null,
        e,
        u
      );
      l.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (e.defaultPrevented) {
                if (Ga !== 0) {
                  var f = new FormData(u, i);
                  kc(
                    a,
                    {
                      pending: !0,
                      data: f,
                      method: u.method,
                      action: n
                    },
                    null,
                    f
                  );
                }
              } else
                typeof n == "function" && (c.preventDefault(), f = new FormData(u, i), kc(
                  a,
                  {
                    pending: !0,
                    data: f,
                    method: u.method,
                    action: n
                  },
                  n,
                  f
                ));
            },
            currentTarget: u
          }
        ]
      });
    }
  }
  for (var Kf = 0; Kf < hc.length; Kf++) {
    var Jf = hc[Kf], fh = Jf.toLowerCase(), sh = Jf[0].toUpperCase() + Jf.slice(1);
    Ct(
      fh,
      "on" + sh
    );
  }
  Ct(Oo, "onAnimationEnd"), Ct(Ao, "onAnimationIteration"), Ct(Do, "onAnimationStart"), Ct("dblclick", "onDoubleClick"), Ct("focusin", "onFocus"), Ct("focusout", "onBlur"), Ct(Sv, "onTransitionRun"), Ct(bv, "onTransitionStart"), Ct(Tv, "onTransitionCancel"), Ct(Mo, "onTransitionEnd"), ze("onMouseEnter", ["mouseout", "mouseover"]), ze("onMouseLeave", ["mouseout", "mouseover"]), ze("onPointerEnter", ["pointerout", "pointerover"]), ze("onPointerLeave", ["pointerout", "pointerover"]), ka(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), ka(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), ka("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), ka(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), ka(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), ka(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var wu = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), oh = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(wu)
  );
  function l0(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var e = l[a], u = e.event;
      e = e.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = e.length - 1; 0 <= i; i--) {
            var c = e[i], f = c.instance, v = c.currentTarget;
            if (c = c.listener, f !== n && u.isPropagationStopped())
              break l;
            n = c, u.currentTarget = v;
            try {
              n(u);
            } catch (S) {
              An(S);
            }
            u.currentTarget = null, n = f;
          }
        else
          for (i = 0; i < e.length; i++) {
            if (c = e[i], f = c.instance, v = c.currentTarget, c = c.listener, f !== n && u.isPropagationStopped())
              break l;
            n = c, u.currentTarget = v;
            try {
              n(u);
            } catch (S) {
              An(S);
            }
            u.currentTarget = null, n = f;
          }
      }
    }
  }
  function $(l, t) {
    var a = t[Ys];
    a === void 0 && (a = t[Ys] = /* @__PURE__ */ new Set());
    var e = l + "__bubble";
    a.has(e) || (t0(t, l, 2, !1), a.add(e));
  }
  function wf(l, t, a) {
    var e = 0;
    t && (e |= 4), t0(
      a,
      l,
      e,
      t
    );
  }
  var Ni = "_reactListening" + Math.random().toString(36).slice(2);
  function Ff(l) {
    if (!l[Ni]) {
      l[Ni] = !0, Qs.forEach(function(a) {
        a !== "selectionchange" && (oh.has(a) || wf(a, !1, l), wf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Ni] || (t[Ni] = !0, wf("selectionchange", !1, t));
    }
  }
  function t0(l, t, a, e) {
    switch (L0(t)) {
      case 2:
        var u = ay;
        break;
      case 8:
        u = ey;
        break;
      default:
        u = vs;
    }
    a = u.bind(
      null,
      t,
      a,
      l
    ), u = void 0, !tc || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (u = !0), e ? u !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: u
    }) : l.addEventListener(t, a, !0) : u !== void 0 ? l.addEventListener(t, a, {
      passive: u
    }) : l.addEventListener(t, a, !1);
  }
  function $f(l, t, a, e, u) {
    var n = e;
    if ((t & 1) === 0 && (t & 2) === 0 && e !== null)
      l: for (; ; ) {
        if (e === null) return;
        var i = e.tag;
        if (i === 3 || i === 4) {
          var c = e.stateNode.containerInfo;
          if (c === u) break;
          if (i === 4)
            for (i = e.return; i !== null; ) {
              var f = i.tag;
              if ((f === 3 || f === 4) && i.stateNode.containerInfo === u)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = Wa(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              e = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        e = e.return;
      }
    lo(function() {
      var v = n, S = Pi(a), E = [];
      l: {
        var r = xo.get(l);
        if (r !== void 0) {
          var g = zn, O = l;
          switch (l) {
            case "keypress":
              if (_n(a) === 0) break l;
            case "keydown":
            case "keyup":
              g = Fm;
              break;
            case "focusin":
              O = "focus", g = nc;
              break;
            case "focusout":
              O = "blur", g = nc;
              break;
            case "beforeblur":
            case "afterblur":
              g = nc;
              break;
            case "click":
              if (a.button === 2) break l;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              g = eo;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              g = Bm;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              g = Pm;
              break;
            case Oo:
            case Ao:
            case Do:
              g = Gm;
              break;
            case Mo:
              g = tv;
              break;
            case "scroll":
            case "scrollend":
              g = Rm;
              break;
            case "wheel":
              g = ev;
              break;
            case "copy":
            case "cut":
            case "paste":
              g = Qm;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              g = no;
              break;
            case "submit":
              g = km;
              break;
            case "toggle":
            case "beforetoggle":
              g = nv;
          }
          var C = (t & 4) !== 0, L = !C && (l === "scroll" || l === "scrollend"), m = C ? r !== null ? r + "Capture" : null : r;
          C = [];
          for (var s = v, y; s !== null; ) {
            var _ = s;
            if (y = _.stateNode, _ = _.tag, _ !== 5 && _ !== 26 && _ !== 27 || y === null || m === null || (_ = hu(s, m), _ != null && C.push(
              Fu(s, _, y)
            )), L) break;
            s = s.return;
          }
          0 < C.length && (r = new g(
            r,
            O,
            null,
            a,
            S
          ), E.push({ event: r, listeners: C }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (g = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", g && a !== Ii && (O = a.relatedTarget || a.fromElement) && (Wa(O) || O[Te]))
            break l;
          (r || g) && (O = S.window === S ? S : (g = S.ownerDocument) ? g.defaultView || g.parentWindow : window, r ? (g = a.relatedTarget || a.toElement, r = v, g = g ? Wa(g) : null, g !== null && (L = I(g), C = g.tag, g !== L || C !== 5 && C !== 27 && C !== 6) && (g = null)) : (r = null, g = v), r !== g && (C = eo, _ = "onMouseLeave", m = "onMouseEnter", s = "mouse", (l === "pointerout" || l === "pointerover") && (C = no, _ = "onPointerLeave", m = "onPointerEnter", s = "pointer"), L = r == null ? O : vu(r), y = g == null ? O : vu(g), O = new C(
            _,
            s + "leave",
            r,
            a,
            S
          ), O.target = L, O.relatedTarget = y, _ = null, Wa(S) === v && (C = new C(
            m,
            s + "enter",
            g,
            a,
            S
          ), C.target = y, C.relatedTarget = L, _ = C), L = _, C = r && g ? nt(
            r,
            g,
            dh
          ) : null, r !== null && a0(
            E,
            O,
            r,
            C,
            !1
          ), g !== null && L !== null && a0(
            E,
            L,
            g,
            C,
            !0
          )));
        }
        l: {
          if (r = v ? vu(v) : window, g = r.nodeName && r.nodeName.toLowerCase(), g === "select" || g === "input" && r.type === "file")
            var x = vo;
          else if (ro(r))
            if (ho)
              x = hv;
            else {
              x = mv;
              var k = rv;
            }
          else
            g = r.nodeName, !g || g.toLowerCase() !== "input" || r.type !== "checkbox" && r.type !== "radio" ? v && ki(v.elementType) && (x = vo) : x = vv;
          if (x && (x = x(l, v))) {
            mo(
              E,
              x,
              a,
              S
            );
            break l;
          }
          k && k(l, r, v);
        }
        switch (k = v ? vu(v) : window, l) {
          case "focusin":
            (ro(k) || k.contentEditable === "true") && (xe = k, rc = v, zu = null);
            break;
          case "focusout":
            zu = rc = xe = null;
            break;
          case "mousedown":
            mc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mc = !1, zo(E, a, S);
            break;
          case "selectionchange":
            if (gv) break;
          case "keydown":
          case "keyup":
            zo(E, a, S);
        }
        var U;
        if (cc)
          l: {
            switch (l) {
              case "compositionstart":
                var q = "onCompositionStart";
                break l;
              case "compositionend":
                q = "onCompositionEnd";
                break l;
              case "compositionupdate":
                q = "onCompositionUpdate";
                break l;
            }
            q = void 0;
          }
        else
          Me ? so(l, a) && (q = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (q = "onCompositionStart");
        q && (io && a.locale !== "ko" && (Me || q !== "onCompositionStart" ? q === "onCompositionEnd" && Me && (U = to()) : (Ta = S, ac = "value" in Ta ? Ta.value : Ta.textContent, Me = !0)), k = Oi(v, q), 0 < k.length && (q = new uo(
          q,
          l,
          null,
          a,
          S
        ), E.push({ event: q, listeners: k }), U ? q.data = U : (U = oo(a), U !== null && (q.data = U)))), (U = cv ? fv(l, a) : sv(l, a)) && (q = Oi(v, "onBeforeInput"), 0 < q.length && (k = new uo(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          S
        ), E.push({
          event: k,
          listeners: q
        }), k.data = U)), ch(
          E,
          l,
          v,
          a,
          S
        );
      }
      l0(E, t);
    });
  }
  function Fu(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Oi(l, t) {
    for (var a = t + "Capture", e = []; l !== null; ) {
      var u = l, n = u.stateNode;
      if (u = u.tag, u !== 5 && u !== 26 && u !== 27 || n === null || (u = hu(l, a), u != null && e.unshift(
        Fu(l, u, n)
      ), u = hu(l, t), u != null && e.push(
        Fu(l, u, n)
      )), l.tag === 3) return e;
      l = l.return;
    }
    return [];
  }
  function dh(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function a0(l, t, a, e, u) {
    for (var n = t._reactName, i = []; a !== null && a !== e; ) {
      var c = a, f = c.alternate, v = c.stateNode;
      if (c = c.tag, f !== null && f === e) break;
      c !== 5 && c !== 26 && c !== 27 || v === null || (f = v, u ? (v = hu(a, n), v != null && i.unshift(
        Fu(a, v, f)
      )) : u || (v = hu(a, n), v != null && i.push(
        Fu(a, v, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var rh = /\r\n?/g, mh = /\u0000|\uFFFD/g;
  function e0(l) {
    return (typeof l == "string" ? l : "" + l).replace(rh, `
`).replace(mh, "");
  }
  function u0(l, t) {
    return t = e0(t), e0(l) === t;
  }
  function dl(l, t, a, e, u, n) {
    switch (a) {
      case "children":
        if (typeof e == "string")
          t === "body" || t === "textarea" && e === "" || Oe(l, e);
        else if (typeof e == "number" || typeof e == "bigint")
          t !== "body" && Oe(l, "" + e);
        else return;
        break;
      case "className":
        Sn(l, "class", e);
        break;
      case "tabIndex":
        Sn(l, "tabindex", e);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Sn(l, a, e);
        break;
      case "style":
        Is(l, e, n);
        return;
      case "data":
        if (t !== "object") {
          Sn(l, "data", e);
          break;
        }
      case "src":
      case "href":
        if (e === "" && (t !== "a" || a !== "href")) {
          l.removeAttribute(a);
          break;
        }
        if (e == null || typeof e == "function" || typeof e == "symbol" || typeof e == "boolean") {
          l.removeAttribute(a);
          break;
        }
        e = bn(e), l.setAttribute(a, e);
        break;
      case "action":
      case "formAction":
        if (typeof e == "function") {
          l.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && dl(l, t, "name", u.name, u, null), dl(
            l,
            t,
            "formEncType",
            u.formEncType,
            u,
            null
          ), dl(
            l,
            t,
            "formMethod",
            u.formMethod,
            u,
            null
          ), dl(
            l,
            t,
            "formTarget",
            u.formTarget,
            u,
            null
          )) : (dl(l, t, "encType", u.encType, u, null), dl(l, t, "method", u.method, u, null), dl(l, t, "target", u.target, u, null)));
        if (e == null || typeof e == "symbol" || typeof e == "boolean") {
          l.removeAttribute(a);
          break;
        }
        e = bn(e), l.setAttribute(a, e);
        break;
      case "onClick":
        e != null && (l.onclick = Qt);
        return;
      case "onScroll":
        e != null && $("scroll", l);
        return;
      case "onScrollEnd":
        e != null && $("scrollend", l);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(h(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(h(60));
            (n != null ? n.__html : void 0) !== a && (l.innerHTML = a);
          }
        }
        break;
      case "multiple":
        l.multiple = e && typeof e != "function" && typeof e != "symbol";
        break;
      case "muted":
        l.muted = e && typeof e != "function" && typeof e != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (e == null || typeof e == "function" || typeof e == "boolean" || typeof e == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        a = bn(e), l.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        e != null && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, e) : l.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "credentialless":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        e && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, "") : l.removeAttribute(a);
        break;
      case "capture":
      case "download":
        e === !0 ? l.setAttribute(a, "") : e !== !1 && e != null && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, e) : l.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        e != null && typeof e != "function" && typeof e != "symbol" && !isNaN(e) && 1 <= e ? l.setAttribute(a, e) : l.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        e == null || typeof e == "function" || typeof e == "symbol" || isNaN(e) ? l.removeAttribute(a) : l.setAttribute(a, e);
        break;
      case "popover":
        $("beforetoggle", l), $("toggle", l), gn(l, "popover", e);
        break;
      case "xlinkActuate":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          e
        );
        break;
      case "xlinkArcrole":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          e
        );
        break;
      case "xlinkRole":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          e
        );
        break;
      case "xlinkShow":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          e
        );
        break;
      case "xlinkTitle":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          e
        );
        break;
      case "xlinkType":
        aa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          e
        );
        break;
      case "xmlBase":
        aa(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          e
        );
        break;
      case "xmlLang":
        aa(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          e
        );
        break;
      case "xmlSpace":
        aa(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          e
        );
        break;
      case "is":
        gn(l, "is", e);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = Um.get(a) || a, gn(l, a, e);
        else return;
    }
    al = !0;
  }
  function Wf(l, t, a, e, u, n) {
    switch (a) {
      case "style":
        Is(l, e, n);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(h(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(h(60));
            (n != null ? n.__html : void 0) !== a && (l.innerHTML = a);
          }
        }
        break;
      case "children":
        if (typeof e == "string") Oe(l, e);
        else if (typeof e == "number" || typeof e == "bigint")
          Oe(l, "" + e);
        else return;
        break;
      case "onScroll":
        e != null && $("scroll", l);
        return;
      case "onScrollEnd":
        e != null && $("scrollend", l);
        return;
      case "onClick":
        e != null && (l.onclick = Qt);
        return;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        return;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!Zs.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (u = a.endsWith("Capture"), n = a.slice(2, u ? a.length - 7 : void 0), t = l[Il] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, u), typeof e == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, e, u);
              break l;
            }
            al = !0, a in l ? l[a] = e : e === !0 ? l.setAttribute(a, "") : gn(l, a, e);
          }
        return;
    }
    al = !0;
  }
  function Vl(l, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        $("error", l), $("load", l);
        var e = !1, u = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var i = a[n];
            if (i != null)
              switch (n) {
                case "src":
                  e = !0;
                  break;
                case "srcSet":
                  u = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(h(137, t));
                default:
                  dl(l, t, n, i, a, null);
              }
          }
        u && dl(l, t, "srcSet", a.srcSet, a, null), e && dl(l, t, "src", a.src, a, null);
        return;
      case "input":
        $("invalid", l);
        var c = n = i = u = null, f = null, v = null;
        for (e in a)
          if (a.hasOwnProperty(e)) {
            var S = a[e];
            if (S != null)
              switch (e) {
                case "name":
                  u = S;
                  break;
                case "type":
                  i = S;
                  break;
                case "checked":
                  f = S;
                  break;
                case "defaultChecked":
                  v = S;
                  break;
                case "value":
                  n = S;
                  break;
                case "defaultValue":
                  c = S;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (S != null)
                    throw Error(h(137, t));
                  break;
                default:
                  dl(l, t, e, S, a, null);
              }
          }
        Fs(
          l,
          n,
          c,
          f,
          v,
          i,
          u,
          !1
        );
        return;
      case "select":
        $("invalid", l), e = i = n = null;
        for (u in a)
          if (a.hasOwnProperty(u) && (c = a[u], c != null))
            switch (u) {
              case "value":
                n = c;
                break;
              case "defaultValue":
                i = c;
                break;
              case "multiple":
                e = c;
              default:
                dl(l, t, u, c, a, null);
            }
        t = n, a = i, l.multiple = !!e, t != null ? Ne(l, !!e, t, !1) : a != null && Ne(l, !!e, a, !0);
        return;
      case "textarea":
        $("invalid", l), n = u = e = null;
        for (i in a)
          if (a.hasOwnProperty(i) && (c = a[i], c != null))
            switch (i) {
              case "value":
                e = c;
                break;
              case "defaultValue":
                u = c;
                break;
              case "children":
                n = c;
                break;
              case "dangerouslySetInnerHTML":
                if (c != null) throw Error(h(91));
                break;
              default:
                dl(l, t, i, c, a, null);
            }
        Ws(l, e, u, n);
        return;
      case "option":
        for (f in a)
          if (a.hasOwnProperty(f) && (e = a[f], e != null))
            switch (f) {
              case "selected":
                l.selected = e && typeof e != "function" && typeof e != "symbol";
                break;
              default:
                dl(l, t, f, e, a, null);
            }
        return;
      case "dialog":
        $("beforetoggle", l), $("toggle", l), $("cancel", l), $("close", l);
        break;
      case "iframe":
      case "object":
        $("load", l);
        break;
      case "video":
      case "audio":
        for (e = 0; e < wu.length; e++)
          $(wu[e], l);
        break;
      case "image":
        $("error", l), $("load", l);
        break;
      case "details":
        $("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        $("error", l), $("load", l);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (v in a)
          if (a.hasOwnProperty(v) && (e = a[v], e != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(h(137, t));
              default:
                dl(l, t, v, e, a, null);
            }
        return;
      default:
        if (ki(t)) {
          for (S in a)
            a.hasOwnProperty(S) && (e = a[S], e !== void 0 && Wf(
              l,
              t,
              S,
              e,
              a,
              void 0
            ));
          return;
        }
    }
    for (c in a)
      a.hasOwnProperty(c) && (e = a[c], e != null && dl(l, t, c, e, a, null));
  }
  var vh = {};
  function hh(l, t, a, e) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var u = null, n = null, i = null, c = null, f = null, v = null, S = null;
        for (g in a) {
          var E = a[g];
          if (a.hasOwnProperty(g) && E != null)
            switch (g) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                f = E;
              default:
                e.hasOwnProperty(g) || dl(l, t, g, null, e, E);
            }
        }
        for (var r in e) {
          var g = e[r];
          if (E = a[r], e.hasOwnProperty(r) && (g != null || E != null))
            switch (r) {
              case "type":
                g !== E && (al = !0), n = g;
                break;
              case "name":
                g !== E && (al = !0), u = g;
                break;
              case "checked":
                g !== E && (al = !0), v = g;
                break;
              case "defaultChecked":
                g !== E && (al = !0), S = g;
                break;
              case "value":
                g !== E && (al = !0), i = g;
                break;
              case "defaultValue":
                g !== E && (al = !0), c = g;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (g != null)
                  throw Error(h(137, t));
                break;
              default:
                g !== E && dl(
                  l,
                  t,
                  r,
                  g,
                  e,
                  E
                );
            }
        }
        $i(
          l,
          i,
          c,
          f,
          v,
          S,
          n,
          u
        );
        return;
      case "select":
        g = i = c = r = null;
        for (n in a)
          if (f = a[n], a.hasOwnProperty(n) && f != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                g = f;
              default:
                e.hasOwnProperty(n) || dl(
                  l,
                  t,
                  n,
                  null,
                  e,
                  f
                );
            }
        for (u in e)
          if (n = e[u], f = a[u], e.hasOwnProperty(u) && (n != null || f != null))
            switch (u) {
              case "value":
                n !== f && (al = !0), r = n;
                break;
              case "defaultValue":
                n !== f && (al = !0), c = n;
                break;
              case "multiple":
                n !== f && (al = !0), i = n;
              default:
                n !== f && dl(
                  l,
                  t,
                  u,
                  n,
                  e,
                  f
                );
            }
        t = c, a = i, e = g, r != null ? Ne(l, !!a, r, !1) : !!e != !!a && (t != null ? Ne(l, !!a, t, !0) : Ne(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        g = r = null;
        for (c in a)
          if (u = a[c], a.hasOwnProperty(c) && u != null && !e.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                dl(l, t, c, null, e, u);
            }
        for (i in e)
          if (u = e[i], n = a[i], e.hasOwnProperty(i) && (u != null || n != null))
            switch (i) {
              case "value":
                u !== n && (al = !0), r = u;
                break;
              case "defaultValue":
                u !== n && (al = !0), g = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(h(91));
                break;
              default:
                u !== n && dl(l, t, i, u, e, n);
            }
        $s(l, r, g);
        return;
      case "option":
        for (var O in a)
          if (r = a[O], a.hasOwnProperty(O) && r != null && !e.hasOwnProperty(O))
            switch (O) {
              case "selected":
                l.selected = !1;
                break;
              default:
                dl(
                  l,
                  t,
                  O,
                  null,
                  e,
                  r
                );
            }
        for (f in e)
          if (r = e[f], g = a[f], e.hasOwnProperty(f) && r !== g && (r != null || g != null))
            switch (f) {
              case "selected":
                r !== g && (al = !0), l.selected = r && typeof r != "function" && typeof r != "symbol";
                break;
              default:
                dl(
                  l,
                  t,
                  f,
                  r,
                  e,
                  g
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var C in a)
          r = a[C], a.hasOwnProperty(C) && r != null && !e.hasOwnProperty(C) && dl(l, t, C, null, e, r);
        for (v in e)
          if (r = e[v], g = a[v], e.hasOwnProperty(v) && r !== g && (r != null || g != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(h(137, t));
                break;
              default:
                dl(
                  l,
                  t,
                  v,
                  r,
                  e,
                  g
                );
            }
        return;
      default:
        if (ki(t)) {
          for (var L in a)
            r = a[L], a.hasOwnProperty(L) && r !== void 0 && !e.hasOwnProperty(L) && Wf(
              l,
              t,
              L,
              void 0,
              e,
              r
            );
          for (S in e)
            r = e[S], g = a[S], !e.hasOwnProperty(S) || r === g || r === void 0 && g === void 0 || Wf(
              l,
              t,
              S,
              r,
              e,
              g
            );
          return;
        }
    }
    for (var m in a)
      r = a[m], a.hasOwnProperty(m) && r != null && !e.hasOwnProperty(m) && dl(l, t, m, null, e, r);
    for (E in e)
      r = e[E], g = a[E], !e.hasOwnProperty(E) || r === g || r == null && g == null || dl(l, t, E, r, e, g);
  }
  function n0(l) {
    switch (l) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function yh() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), e = 0; e < a.length; e++) {
        var u = a[e], n = u.transferSize, i = u.initiatorType, c = u.duration;
        if (n && c && n0(i)) {
          for (i = 0, c = u.responseEnd, e += 1; e < a.length; e++) {
            var f = a[e], v = f.startTime;
            if (v > c) break;
            var S = f.transferSize, E = f.initiatorType;
            S && n0(E) && (f = f.responseEnd, i += S * (f < c ? 1 : (c - v) / (f - v)));
          }
          if (--e, t += 8 * (n + i) / (u.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var kf = null, If = null;
  function $u(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function i0(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function c0(l, t) {
    if (l === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return l === 1 && t === "foreignObject" ? 0 : l;
  }
  function f0(l, t, a, e) {
    return a = $u(
      a
    ).createElement(l), a[Yl] = e, a[Il] = t, Vl(a, l, t), pl(a), a;
  }
  function Pf(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var ls = null;
  function gh() {
    var l = window.event;
    return l && l.type === "popstate" ? l === ls ? !1 : (ls = l, !0) : (ls = null, !1);
  }
  var ts = typeof setTimeout == "function" ? setTimeout : void 0, Sh = typeof clearTimeout == "function" ? clearTimeout : void 0, s0 = typeof Promise == "function" ? Promise : void 0, o0 = typeof requestAnimationFrame == "function" ? requestAnimationFrame : ts, bh = typeof queueMicrotask == "function" ? queueMicrotask : typeof s0 < "u" ? function(l) {
    return s0.resolve(null).then(l).catch(Th);
  } : ts;
  function Th(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Xa(l) {
    return l === "head";
  }
  function d0(l, t) {
    var a = t, e = 0;
    do {
      var u = a.nextSibling;
      if (l.removeChild(a), u && u.nodeType === 8)
        if (a = u.data, a === "/$" || a === "/&") {
          if (e === 0) {
            l.removeChild(u), fu(t);
            return;
          }
          e--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          e++;
        else if (a === "html")
          ss(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, ss(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[mu] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && ss(l.ownerDocument.body);
      a = u;
    } while (a);
    fu(t);
  }
  function r0(l, t) {
    var a = l;
    l = 0;
    do {
      var e = a.nextSibling;
      if (a.nodeType === 1 ? t ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (t ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), e && e.nodeType === 8)
        if (a = e.data, a === "/$") {
          if (l === 0) break;
          l--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || l++;
      a = e;
    } while (a);
  }
  function m0(l, t, a) {
    if (t = CSS.escape(t) !== t ? "r-" + btoa(t).replace(/=/g, "") : t, l.style.viewTransitionName = t, a != null && (l.style.viewTransitionClass = a), a = getComputedStyle(l), a.display === "inline") {
      if (t = l.getClientRects(), t.length === 1) var e = 1;
      else
        for (var u = e = 0; u < t.length; u++) {
          var n = t[u];
          0 < n.width && 0 < n.height && e++;
        }
      e === 1 && (l = l.style, l.display = t.length === 1 ? "inline-block" : "block", l.marginTop = "-" + a.paddingTop, l.marginBottom = "-" + a.paddingBottom);
    }
  }
  function v0(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function _h(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function as(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return _h(t, a, l);
  }
  function Eh(l) {
    return l.documentElement.clientHeight;
  }
  function zh(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function Nh(l, t, a, e, u, n, i, c, f) {
    var v = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var S = v.startViewTransition({
        update: function() {
          var r = v.defaultView, g = r.navigation && r.navigation.transition, O = v.fonts.status;
          e();
          var C = [];
          if (O === "loaded" && (Eh(v), v.fonts.status === "loading" && C.push(v.fonts.ready)), O = C.length, l !== null)
            for (var L = l.suspenseyImages, m = 0, s = 0; s < L.length; s++) {
              var y = L[s];
              if (!y.complete) {
                var _ = y.getBoundingClientRect();
                if (0 < _.bottom && 0 < _.right && _.top < r.innerHeight && _.left < r.innerWidth) {
                  if (m += H0(y), m > Mi) {
                    C.length = O;
                    break;
                  }
                  y = new Promise(
                    zh.bind(y)
                  ), C.push(y);
                }
              }
            }
          if (0 < C.length)
            return r = Promise.race([
              Promise.all(C),
              new Promise(function(x) {
                return setTimeout(x, 500);
              })
            ]).then(u, u), (g ? Promise.allSettled([g.finished, r]) : r).then(n, n);
          if (u(), g)
            return g.finished.then(
              n,
              n
            );
          n();
        },
        types: a
      });
      v.__reactViewTransition = S;
      var E = [];
      return S.ready.then(
        function() {
          for (var r = v.documentElement.getAnimations({
            subtree: !0
          }), g = 0; g < r.length; g++) {
            var O = r[g], C = O.effect, L = C.pseudoElement;
            if (L != null && L.startsWith("::view-transition")) {
              E.push(O), O = C.getKeyframes();
              for (var m = L = void 0, s = !0, y = 0; y < O.length; y++) {
                var _ = O[y], x = _.width;
                if (L === void 0) L = x;
                else if (L !== x) {
                  s = !1;
                  break;
                }
                if (x = _.height, m === void 0) m = x;
                else if (m !== x) {
                  s = !1;
                  break;
                }
                delete _.width, delete _.height, _.transform === "none" && delete _.transform;
              }
              s && L !== void 0 && m !== void 0 && (C.setKeyframes(O), s = getComputedStyle(
                C.target,
                C.pseudoElement
              ), s.width !== L || s.height !== m) && (s = O[0], s.width = L, s.height = m, s = O[O.length - 1], s.width = L, s.height = m, C.setKeyframes(O));
            }
          }
          i();
        },
        function(r) {
          v.__reactViewTransition === S && (v.__reactViewTransition = null);
          try {
            if (typeof r == "object" && r !== null)
              switch (r.name) {
                case "InvalidStateError":
                  (r.message === "View transition was skipped because document visibility state is hidden." || r.message === "Skipping view transition because document visibility state has become hidden." || r.message === "Skipping view transition because viewport size changed." || r.message === "Transition was aborted because of invalid state") && (r = null);
              }
            r !== null && f(r);
          } finally {
            e(), u(), i();
          }
        }
      ), S.finished.finally(function() {
        for (var r = 0; r < E.length; r++)
          E[r].cancel();
        v.__reactViewTransition === S && (v.__reactViewTransition = null), c();
      }), S;
    } catch {
      return e(), u(), i(), null;
    }
  }
  function ge(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  ge.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : w({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, ge.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), e = [], u = 0; u < a.length; u++) {
      var n = a[u].effect;
      n !== null && n.target === l && n.pseudoElement === t && e.push(a[u]);
    }
    return e;
  }, ge.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function h0(l) {
    return {
      name: l,
      group: new ge("group", l),
      imagePair: new ge("image-pair", l),
      old: new ge("old", l),
      new: new ge("new", l)
    };
  }
  function gt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  gt.prototype.addEventListener = function(l, t, a) {
    var e = null, u = null;
    if (!(a != null && typeof a != "boolean" && (e = a.signal || null, e !== null && e.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (g0(n, l, t, a) === -1) {
        var i = this, c = t;
        a != null && typeof a != "boolean" && a.once === !0 && (c = function(f) {
          i.removeEventListener(
            l,
            t,
            a
          ), typeof t == "function" ? t.call(this, f) : t.handleEvent(f);
        }), e !== null && (u = i.removeEventListener.bind(
          i,
          l,
          t,
          a
        ), e.addEventListener("abort", u, { once: !0 }), u = e.removeEventListener.bind(e, "abort", u)), e = au(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: u
        }), T(
          this._fragmentFiber.child,
          !1,
          Oh,
          l,
          c,
          e
        );
      }
      this._eventListeners = n;
    }
  };
  function Oh(l, t, a, e) {
    return rl(l).addEventListener(
      t,
      a,
      e
    ), !1;
  }
  gt.prototype.removeEventListener = function(l, t, a) {
    var e = this._eventListeners;
    if (e !== null && (t = g0(
      e,
      l,
      t,
      a
    ), t !== -1)) {
      var u = e[t];
      a = u.attachedListener;
      var n = u.cleanup;
      u = au(u.optionsOrUseCapture), T(
        this._fragmentFiber.child,
        !1,
        Ah,
        l,
        a,
        u
      ), e.splice(t, 1), n !== null && n();
    }
  };
  function Ah(l, t, a, e) {
    return rl(l).removeEventListener(
      t,
      a,
      e
    ), !1;
  }
  function au(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function y0(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function g0(l, t, a, e) {
    if (l.length === 0) return -1;
    e = y0(e);
    for (var u = 0; u < l.length; u++) {
      var n = l[u];
      if (n.type === t && n.listener === a && y0(n.optionsOrUseCapture) === e)
        return u;
    }
    return -1;
  }
  gt.prototype.dispatchEvent = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = rl(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var e = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.addEventListener(
            n.type,
            n.attachedListener,
            au(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(e), l = e.dispatchEvent(l), a)
        for (u = 0; u < a.length; u++)
          n = a[u], e.removeEventListener(
            n.type,
            n.attachedListener,
            au(n.optionsOrUseCapture)
          );
      return t.removeChild(e), l;
    }
    return t.dispatchEvent(l);
  }, gt.prototype.focus = function(l) {
    T(
      this._fragmentFiber.child,
      !0,
      S0,
      l,
      void 0,
      void 0
    );
  };
  function S0(l, t) {
    return l.tag === 6 ? !1 : (l = rl(l), Yh(l, t));
  }
  gt.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      es,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !S0(t[a], l); a--) ;
  };
  function es(l, t) {
    return t.push(l), !1;
  }
  gt.prototype.blur = function() {
    var l = H(
      this._fragmentFiber
    );
    l !== null && (l = rl(l), l = $u(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      Dh,
      l,
      void 0,
      void 0
    ));
  };
  function Dh(l, t) {
    return l.tag === 6 ? !1 : (l = rl(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  gt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Mh,
      l,
      void 0,
      void 0
    );
  };
  function Mh(l, t) {
    return l.tag === 6 || (l = rl(l), t.observe(l)), !1;
  }
  gt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), T(
        this._fragmentFiber.child,
        !1,
        xh,
        l,
        void 0,
        void 0
      );
      for (var a = t = 0; a < Ht.length; a++) {
        var e = Ht[a];
        e.fragmentInstance === this && e.observer === l ? l.unobserve(e.instance) : Ht[t++] = e;
      }
      Ht.length = t;
    }
  };
  function xh(l, t) {
    return l.tag === 6 || (l = rl(l), t.unobserve(l)), !1;
  }
  var Ht = [], us = !1;
  function Ch(l, t, a) {
    Ht.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), us || (us = !0, Gh(function() {
      us = !1;
      var e = Ht;
      Ht = [];
      for (var u = 0; u < e.length; u++) {
        var n = e[u];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  gt.prototype.getClientRects = function() {
    var l = [];
    return T(
      this._fragmentFiber.child,
      !1,
      jh,
      l,
      void 0,
      void 0
    ), l;
  };
  function jh(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = rl(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  gt.prototype.getRootNode = function(l) {
    var t = H(
      this._fragmentFiber
    );
    return t === null ? this : rl(t).getRootNode(l);
  }, gt.prototype.compareDocumentPosition = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      es,
      a,
      void 0,
      void 0
    );
    var e = rl(t);
    if (a.length === 0) {
      if (a = e, B(this._fragmentFiber)) {
        l: {
          for (t = this._fragmentFiber.return; t !== null; ) {
            if (t.tag === 4) {
              t = t.stateNode.containerInfo;
              break l;
            }
            if (t.tag === 3 || t.tag === 5 || t.tag === 27)
              break;
            t = t.return;
          }
          t = null;
        }
        t != null && (a = t);
      }
      t = this._fragmentFiber;
      var u = e = a.compareDocumentPosition(l);
      return a === l ? u = Node.DOCUMENT_POSITION_CONTAINS : e & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = gl(t)[1], a === null ? u = Node.DOCUMENT_POSITION_PRECEDING : (l = rl(a).compareDocumentPosition(
        l
      ), u = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), u |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = rl(a[0]), u = rl(a[a.length - 1]);
    var n = B(this._fragmentFiber) ? t.parentElement : e;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    e = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = u.compareDocumentPosition(l), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = e && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = e && t === l || n && u === l || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !e && t === l || !n && u === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Uh(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Uh(l, t, a, e, u) {
    var n = Wa(u);
    if (l & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (a = !!n)
        l: {
          for (; n !== null; ) {
            if (n.tag === 7 && (n === t || n.alternate === t)) {
              a = !0;
              break l;
            }
            n = n.return;
          }
          a = !1;
        }
      return a;
    }
    if (l & Node.DOCUMENT_POSITION_CONTAINS) {
      if (n === null)
        return n = u.ownerDocument, u === n || u === n.documentElement || u === n.body;
      l: {
        for (n = t, t = H(t); n !== null; ) {
          if (!(n.tag !== 5 && n.tag !== 3 && n.tag !== 27 || n !== t && n.alternate !== t)) {
            n = !0;
            break l;
          }
          n = n.return;
        }
        n = !1;
      }
      return n;
    }
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = nt(
      a,
      n,
      qt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Ja,
      n,
      a
    ), n = Jl, Jl = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === e) && (t = nt(
      e,
      n,
      qt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Bt,
      n,
      e
    ), n = Jl, ut = Jl = null, t = n !== null)), t) : !1;
  }
  function b0(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  gt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(h(566));
    var t = [];
    T(
      this._fragmentFiber.child,
      !1,
      es,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var e = gl(
        this._fragmentFiber
      );
      if (e = a ? e[1] || e[0] || H(this._fragmentFiber) : e[0] || e[1], e === null) return;
      if (e.tag === 6) {
        l = rl(e), b0(l, a);
        return;
      }
      if (e = rl(e), e.nodeType !== 9) {
        if (e.nodeType === 11) {
          a = "host" in e ? e.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        e.scrollIntoView(l);
      }
    }
    for (e = a ? t.length - 1 : 0; e !== (a ? -1 : t.length); ) {
      var u = t[e];
      u.tag === 6 ? (u = rl(u), b0(u, a)) : rl(u).scrollIntoView(l), e += a ? -1 : 1;
    }
  };
  function ph(l, t) {
    return l = rl(l), T0(l, t), !1;
  }
  function T0(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function _0(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        l.addEventListener(
          u.type,
          u.attachedListener,
          au(u.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < Ht.length; c++) {
        var f = Ht[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && (Ht[i++] = f);
      }
      Ht.length = i, n.observe(l);
    }), T0(l, t));
  }
  function Rh(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        l.removeEventListener(
          u.type,
          u.attachedListener,
          au(u.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      typeof n.rootMargin == "string" ? Ch(
        t,
        n,
        l
      ) : n.unobserve(l);
    }), l.reactFragments != null && l.reactFragments.delete(t));
  }
  function ns(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          ns(a), yn(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      l.removeChild(a);
    }
  }
  function Hh(l, t, a, e) {
    for (; l.nodeType === 1; ) {
      var u = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!e && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (e) {
        if (!l[mu])
          switch (t) {
            case "meta":
              if (!l.hasAttribute("itemprop")) break;
              return l;
            case "link":
              if (n = l.getAttribute("rel"), n === "stylesheet" && l.hasAttribute("data-precedence"))
                break;
              if (n !== u.rel || l.getAttribute("href") !== (u.href == null || u.href === "" ? null : u.href) || l.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin) || l.getAttribute("title") !== (u.title == null ? null : u.title))
                break;
              return l;
            case "style":
              if (l.hasAttribute("data-precedence")) break;
              return l;
            case "script":
              if (n = l.getAttribute("src"), (n !== (u.src == null ? null : u.src) || l.getAttribute("type") !== (u.type == null ? null : u.type) || l.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin)) && n && l.hasAttribute("async") && !l.hasAttribute("itemprop"))
                break;
              return l;
            default:
              return l;
          }
      } else if (t === "input" && l.type === "hidden") {
        var n = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && l.getAttribute("name") === n)
          return l;
      } else return l;
      if (l = Dt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function Bh(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Dt(l.nextSibling), l === null)) return null;
    return l;
  }
  function E0(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Dt(l.nextSibling), l === null)) return null;
    return l;
  }
  function is(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function cs(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function qh(l, t) {
    var a = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || a.readyState !== "loading")
      t();
    else {
      var e = function() {
        t(), a.removeEventListener("DOMContentLoaded", e);
      };
      a.addEventListener("DOMContentLoaded", e), l._reactRetry = e;
    }
  }
  function Dt(l) {
    for (; l != null; l = l.nextSibling) {
      var t = l.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = l.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F")
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return l;
  }
  var fs = null;
  function z0(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Dt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function N0(l) {
    l = l.previousSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (t === 0) return l;
          t--;
        } else a !== "/$" && a !== "/&" || t++;
      }
      l = l.previousSibling;
    }
    return null;
  }
  function Yh(l, t) {
    function a() {
      e = !0;
    }
    if (l.ownerDocument.activeElement === l) return !0;
    var e = !1;
    try {
      l.ownerDocument.addEventListener("focus", a, !0), (l.focus || HTMLElement.prototype.focus).call(l, t);
    } finally {
      l.ownerDocument.removeEventListener("focus", a, !0);
    }
    return e;
  }
  function Gh(l) {
    o0(function() {
      o0(function(t) {
        return l(t);
      });
    });
  }
  function O0(l, t, a) {
    switch (t = $u(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(h(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(h(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(h(454));
        return l;
      default:
        throw Error(h(451));
    }
  }
  function A0(l, t, a) {
    for (var e in a) {
      var u = a[e];
      a.hasOwnProperty(e) && u != null && dl(l, t, e, null, vh, u);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === Qt && (l.onclick = null), yn(l);
  }
  function ss(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    yn(l);
  }
  var Mt = /* @__PURE__ */ new Map(), D0 = /* @__PURE__ */ new Set();
  function Wu(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var ha = X.d;
  X.d = {
    f: Xh,
    r: Qh,
    D: Zh,
    C: Vh,
    L: Lh,
    m: Kh,
    X: wh,
    S: Jh,
    M: Fh
  };
  function Xh() {
    var l = ha.f(), t = bi();
    return l || t;
  }
  function Qh(l) {
    var t = _e(l);
    t !== null && t.tag === 5 && t.type === "form" ? xd(t) : ha.r(l);
  }
  var eu = typeof document > "u" ? null : document;
  function M0(l, t, a) {
    var e = eu;
    if (e && typeof t == "string" && t) {
      var u = Tt(t);
      u = 'link[rel="' + l + '"][href="' + u + '"]', typeof a == "string" && (u += '[crossorigin="' + a + '"]'), D0.has(u) || (D0.add(u), l = { rel: l, crossOrigin: a, href: t }, e.querySelector(u) === null && (t = e.createElement("link"), Vl(t, "link", l), pl(t), e.head.appendChild(t)));
    }
  }
  function Zh(l) {
    ha.D(l), M0("dns-prefetch", l, null);
  }
  function Vh(l, t) {
    ha.C(l, t), M0("preconnect", l, t);
  }
  function Lh(l, t, a) {
    ha.L(l, t, a);
    var e = eu;
    if (e && l && t) {
      var u = 'link[rel="preload"][as="' + Tt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (u += '[imagesrcset="' + Tt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (u += '[imagesizes="' + Tt(
        a.imageSizes
      ) + '"]')) : u += '[href="' + Tt(l) + '"]';
      var n = u;
      switch (t) {
        case "style":
          n = uu(l);
          break;
        case "script":
          n = nu(l);
      }
      if (!(Mt.has(n) || (l = w(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Mt.set(n, l), e.querySelector(u) !== null || t === "style" && e.querySelector(ku(n)) || t === "script" && e.querySelector(Iu(n))))) {
        var i = e.createElement("link");
        Vl(i, "link", l), t === "style" && (i[hn] = !0, i.onload = i.onerror = function() {
          Xs(i);
        }), pl(i), e.head.appendChild(i);
      }
    }
  }
  function Kh(l, t) {
    ha.m(l, t);
    var a = eu;
    if (a && l) {
      var e = t && typeof t.as == "string" ? t.as : "script", u = 'link[rel="modulepreload"][as="' + Tt(e) + '"][href="' + Tt(l) + '"]', n = u;
      switch (e) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = nu(l);
      }
      if (!Mt.has(n) && (l = w({ rel: "modulepreload", href: l }, t), Mt.set(n, l), a.querySelector(u) === null)) {
        switch (e) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(Iu(n)))
              return;
        }
        e = a.createElement("link"), Vl(e, "link", l), pl(e), a.head.appendChild(e);
      }
    }
  }
  function Jh(l, t, a) {
    ha.S(l, t, a);
    var e = eu;
    if (e && l) {
      var u = Ee(e).hoistableStyles, n = uu(l);
      t = t || "default";
      var i = u.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = e.querySelector(
          ku(n)
        ))
          c.loading = 5;
        else {
          l = w(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Mt.get(n)) && os(l, a);
          var f = i = e.createElement("link");
          pl(f), Vl(f, "link", l), f._p = new Promise(function(v, S) {
            f.onload = v, f.onerror = S;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Ai(i, t, e);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: c
        }, u.set(n, i);
      }
    }
  }
  function wh(l, t) {
    ha.X(l, t);
    var a = eu;
    if (a && l) {
      var e = Ee(a).hoistableScripts, u = nu(l), n = e.get(u);
      n || (n = a.querySelector(Iu(u)), n || (l = w({ src: l, async: !0 }, t), (t = Mt.get(u)) && ds(l, t), n = a.createElement("script"), pl(n), Vl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function Fh(l, t) {
    ha.M(l, t);
    var a = eu;
    if (a && l) {
      var e = Ee(a).hoistableScripts, u = nu(l), n = e.get(u);
      n || (n = a.querySelector(Iu(u)), n || (l = w({ src: l, async: !0, type: "module" }, t), (t = Mt.get(u)) && ds(l, t), n = a.createElement("script"), pl(n), Vl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function x0(l, t, a, e) {
    var u = (u = ga.current) ? Wu(u) : null;
    if (!u) throw Error(h(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = uu(a.href), t = Ee(
          u
        ).hoistableStyles, e = t.get(a), e || (e = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = uu(a.href);
          var n = Ee(
            u
          ).hoistableStyles, i = n.get(l);
          if (i || (u = u.ownerDocument || u, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = u.querySelector(
            ku(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Mt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Mt.set(l, n)), $h(
            u,
            l,
            n,
            i.state
          ))), t && e === null)
            throw Error(h(528, ""));
          return i;
        }
        if (t && e !== null)
          throw Error(h(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = nu(a), t = Ee(
          u
        ).hoistableScripts, e = t.get(a), e || (e = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(h(444, l));
    }
  }
  function uu(l) {
    return 'href="' + Tt(l) + '"';
  }
  function ku(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function C0(l) {
    return w({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function $h(l, t, a, e) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[hn] !== !0) {
        e.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[hn] = !0, t.onload = t.onerror = Xs.bind(null, t), Vl(t, "link", a), pl(t), l.head.appendChild(t);
    e.preload = t, t.addEventListener("load", function() {
      return e.loading |= 1;
    }), t.addEventListener("error", function() {
      return e.loading |= 2;
    });
  }
  function nu(l) {
    return '[src="' + Tt(l) + '"]';
  }
  function Iu(l) {
    return "script[async]" + l;
  }
  function j0(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var e = l.querySelector(
            'style[data-href~="' + Tt(a.href) + '"]'
          );
          if (e)
            return t.instance = e, pl(e), e;
          var u = w({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return e = (l.ownerDocument || l).createElement(
            "style"
          ), pl(e), Vl(e, "style", u), Ai(e, a.precedence, l), t.instance = e;
        case "stylesheet":
          u = uu(a.href);
          var n = l.querySelector(
            ku(u)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, pl(n), n;
          e = C0(a), (u = Mt.get(u)) && os(e, u), n = (l.ownerDocument || l).createElement("link"), pl(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), Vl(n, "link", e), t.state.loading |= 4, Ai(n, a.precedence, l), t.instance = n;
        case "script":
          return n = nu(a.src), (u = l.querySelector(
            Iu(n)
          )) ? (t.instance = u, pl(u), u) : (e = a, (u = Mt.get(n)) && (e = w({}, a), ds(e, u)), l = l.ownerDocument || l, u = l.createElement("script"), pl(u), Vl(u, "link", e), l.head.appendChild(u), t.instance = u);
        case "void":
          return null;
        default:
          throw Error(h(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (e = t.instance, t.state.loading |= 4, Ai(e, a.precedence, l));
    return t.instance;
  }
  function Ai(l, t, a) {
    for (var e = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), u = e.length ? e[e.length - 1] : null, n = u, i = 0; i < e.length; i++) {
      var c = e[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== u) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function os(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function ds(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Di = null;
  function U0(l, t, a) {
    if (Di === null) {
      var e = /* @__PURE__ */ new Map(), u = Di = /* @__PURE__ */ new Map();
      u.set(a, e);
    } else
      u = Di, e = u.get(a), e || (e = /* @__PURE__ */ new Map(), u.set(a, e));
    if (e.has(l)) return e;
    for (e.set(l, null), a = a.getElementsByTagName(l), u = 0; u < a.length; u++) {
      var n = a[u];
      if (!(n[mu] || n[Yl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = e.get(i);
        c ? c.push(n) : e.set(i, [n]);
      }
    }
    return e;
  }
  function rs(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function Wh(l, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (l) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        switch (t.rel) {
          case "stylesheet":
            return l = t.disabled, typeof t.precedence == "string" && l == null;
          default:
            return !0;
        }
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function p0(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function R0(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function H0(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function B0(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += H0(t), l.suspenseyImages.push(t)), l = Ph.bind(l), t.decode().then(l, l));
  }
  function kh(l, t, a, e) {
    if (a.type === "stylesheet" && (typeof e.media != "string" || matchMedia(e.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var u = uu(e.href), n = t.querySelector(
          ku(u)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = Pu.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, pl(n);
          return;
        }
        n = t.ownerDocument || t, e = C0(e), (u = Mt.get(u)) && os(e, u), n = n.createElement("link"), pl(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), Vl(n, "link", e), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = Pu.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Mi = 0;
  function Ih(l, t) {
    return l.stylesheets && l.count === 0 && Ci(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var e = setTimeout(function() {
        if (l.stylesheets && Ci(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Mi === 0 && (Mi = 62500 * yh());
      var u = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Ci(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > Mi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(e), clearTimeout(u);
      };
    } : null;
  }
  function q0(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) Ci(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function Pu() {
    this.count--, q0(this);
  }
  function Ph() {
    this.imgCount--, q0(this);
  }
  var xi = null;
  function Ci(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, xi = /* @__PURE__ */ new Map(), t.forEach(ly, l), xi = null, Pu.call(l));
  }
  function ly(l, t) {
    if (!(t.state.loading & 4)) {
      var a = xi.get(l);
      if (a) var e = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), xi.set(l, a);
        for (var u = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < u.length; n++) {
          var i = u[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), e = i);
        }
        e && a.set(null, e);
      }
      u = t.instance, i = u.getAttribute("data-precedence"), n = a.get(i) || e, n === e && a.set(null, u), a.set(i, u), this.count++, e = Pu.bind(this), u.addEventListener("load", e), u.addEventListener("error", e), n ? n.parentNode.insertBefore(u, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(u, l.firstChild)), t.state.loading |= 4;
    }
  }
  var iu = {
    $$typeof: Ul,
    Provider: null,
    Consumer: null,
    _currentValue: la,
    _currentValue2: la,
    _threadCount: 0
  };
  function ty(l, t, a, e, u, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Ki(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ki(0), this.hiddenUpdates = Ki(null), this.identifierPrefix = e, this.onUncaughtError = u, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Y0(l, t, a, e, u, n, i, c, f, v, S, E) {
    return l = new ty(
      l,
      t,
      a,
      i,
      f,
      v,
      S,
      E,
      c
    ), t = 1, n === !0 && (t |= 24), n = Pl(3, null, null, t), l.current = n, n.stateNode = l, t = Ac(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: e,
      isDehydrated: a,
      cache: t
    }, Cc(n), l;
  }
  function G0(l) {
    return l ? (l = Ue, l) : Ue;
  }
  function X0(l, t, a, e, u, n) {
    u = G0(u), e.context === null ? e.context = u : e.pendingContext = u, e = Ma(t), e.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (e.callback = n), a = xa(l, e, t), a !== null && (et(a, l, t), Cu(a, l, t));
  }
  function Q0(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function ms(l, t) {
    Q0(l, t), (l = l.alternate) && Q0(l, t);
  }
  function Z0(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = le(l, 67108864);
      t !== null && et(t, l, 67108864), ms(l, 67108864);
    }
  }
  function V0(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = yt();
      t = Ji(t);
      var a = le(l, t);
      a !== null && et(a, l, t), ms(l, t);
    }
  }
  var cu = !0;
  function ay(l, t, a, e) {
    var u = j.T;
    j.T = null;
    var n = X.p;
    try {
      X.p = 2, vs(l, t, a, e);
    } finally {
      X.p = n, j.T = u;
    }
  }
  function ey(l, t, a, e) {
    var u = j.T;
    j.T = null;
    var n = X.p;
    try {
      X.p = 8, vs(l, t, a, e);
    } finally {
      X.p = n, j.T = u;
    }
  }
  function vs(l, t, a, e) {
    if (cu) {
      var u = hs(e);
      if (u === null)
        $f(
          l,
          t,
          e,
          ji,
          a
        ), K0(l, e);
      else if (ny(
        u,
        l,
        t,
        a,
        e
      ))
        e.stopPropagation();
      else if (K0(l, e), t & 4 && -1 < uy.indexOf(l)) {
        for (; u !== null; ) {
          var n = _e(u);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = $a(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - st(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    kt(n), (nl & 6) === 0 && (yi = ct() + 500, Ju(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = le(n, 2), c !== null && et(c, n, 2), bi(), ms(n, 2);
            }
          if (n = hs(e), n === null && $f(
            l,
            t,
            e,
            ji,
            a
          ), n === u) break;
          u = n;
        }
        u !== null && e.stopPropagation();
      } else
        $f(
          l,
          t,
          e,
          null,
          a
        );
    }
  }
  function hs(l) {
    return l = Pi(l), ys(l);
  }
  var ji = null;
  function ys(l) {
    if (ji = null, l = Wa(l), l !== null) {
      var t = I(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = vl(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = Z(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return ji = l, null;
  }
  function L0(l) {
    switch (l) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "fullscreenerror":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "resize":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (ym()) {
          case Ms:
            return 2;
          case xs:
            return 8;
          case on:
          case gm:
            return 32;
          case Cs:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var gs = !1, Qa = null, Za = null, Va = null, ln = /* @__PURE__ */ new Map(), tn = /* @__PURE__ */ new Map(), La = [], uy = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function K0(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Qa = null;
        break;
      case "dragenter":
      case "dragleave":
        Za = null;
        break;
      case "mouseover":
      case "mouseout":
        Va = null;
        break;
      case "pointerover":
      case "pointerout":
        ln.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        tn.delete(t.pointerId);
    }
  }
  function an(l, t, a, e, u, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: e,
      nativeEvent: n,
      targetContainers: [u]
    }, t !== null && (t = _e(t), t !== null && Z0(t)), l) : (l.eventSystemFlags |= e, t = l.targetContainers, u !== null && t.indexOf(u) === -1 && t.push(u), l);
  }
  function ny(l, t, a, e, u) {
    switch (t) {
      case "focusin":
        return Qa = an(
          Qa,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "dragenter":
        return Za = an(
          Za,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "mouseover":
        return Va = an(
          Va,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "pointerover":
        var n = u.pointerId;
        return ln.set(
          n,
          an(
            ln.get(n) || null,
            l,
            t,
            a,
            e,
            u
          )
        ), !0;
      case "gotpointercapture":
        return n = u.pointerId, tn.set(
          n,
          an(
            tn.get(n) || null,
            l,
            t,
            a,
            e,
            u
          )
        ), !0;
    }
    return !1;
  }
  function J0(l) {
    var t = Wa(l.target);
    if (t !== null) {
      var a = I(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = vl(a), t !== null) {
            l.blockedOn = t, qs(l.priority, function() {
              V0(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Z(a), t !== null) {
            l.blockedOn = t, qs(l.priority, function() {
              V0(a);
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          l.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    l.blockedOn = null;
  }
  function Ui(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = hs(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var e = new a.constructor(
          a.type,
          a
        );
        Ii = e, a.target.dispatchEvent(e), Ii = null;
      } else
        return t = _e(a), t !== null && Z0(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function w0(l, t, a) {
    Ui(l) && a.delete(t);
  }
  function iy() {
    gs = !1, Qa !== null && Ui(Qa) && (Qa = null), Za !== null && Ui(Za) && (Za = null), Va !== null && Ui(Va) && (Va = null), ln.forEach(w0), tn.forEach(w0);
  }
  function pi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, gs || (gs = !0, b.unstable_scheduleCallback(
      b.unstable_NormalPriority,
      iy
    )));
  }
  var Ri = null;
  function F0(l) {
    Ri !== l && (Ri = l, b.unstable_scheduleCallback(
      b.unstable_NormalPriority,
      function() {
        Ri === l && (Ri = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], e = l[t + 1], u = l[t + 2];
          if (typeof e != "function") {
            if (ys(e || a) === null)
              continue;
            break;
          }
          var n = _e(a);
          n !== null && (l.splice(t, 3), t -= 3, kc(
            n,
            {
              pending: !0,
              data: u,
              method: a.method,
              action: e
            },
            e,
            u
          ));
        }
      }
    ));
  }
  function fu(l) {
    function t(f) {
      return pi(f, l);
    }
    Qa !== null && pi(Qa, l), Za !== null && pi(Za, l), Va !== null && pi(Va, l), ln.forEach(t), tn.forEach(t);
    for (var a = 0; a < La.length; a++) {
      var e = La[a];
      e.blockedOn === l && (e.blockedOn = null);
    }
    for (; 0 < La.length && (a = La[0], a.blockedOn === null); )
      J0(a), a.blockedOn === null && La.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (e = 0; e < a.length; e += 3) {
        var u = a[e], n = a[e + 1], i = u[Il] || null;
        if (typeof n == "function")
          i || F0(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (u = n, i = n[Il] || null)
              c = i.formAction;
            else if (ys(u) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[e + 1] = c : (a.splice(e, 3), e -= 3), F0(a);
        }
      }
  }
  function $0() {
    function l(n) {
      n.canIntercept && n.info === "react-transition" && n.intercept({
        handler: function() {
          return new Promise(function(i) {
            return u = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      u !== null && (u(), u = null), e || setTimeout(a, 20);
    }
    function a() {
      if (!e && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var e = !1, u = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(a, 100), function() {
        e = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), u !== null && (u(), u = null);
      };
    }
  }
  function Ss(l) {
    this._internalRoot = l;
  }
  Hi.prototype.render = Ss.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(h(409));
    var a = t.current, e = yt();
    X0(a, e, l, t, null, null);
  }, Hi.prototype.unmount = Ss.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      X0(l.current, 2, null, l, null, null), bi(), t[Te] = null;
    }
  };
  function Hi(l) {
    this._internalRoot = l;
  }
  Hi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Bs();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < La.length && t !== 0 && t < La[a].priority; a++) ;
      La.splice(a, 0, l), a === 0 && J0(l);
    }
  };
  var W0 = N.version;
  if (W0 !== "19.3.1")
    throw Error(
      h(
        527,
        W0,
        "19.3.1"
      )
    );
  X.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(h(188)) : (l = Object.keys(l).join(","), Error(h(268, l)));
    return l = _l(t), l = l !== null ? M(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var cy = {
    bundleType: 0,
    version: "19.3.1",
    rendererPackageName: "react-dom",
    currentDispatcherRef: j,
    reconcilerVersion: "19.3.1"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Bi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Bi.isDisabled && Bi.supportsFiber)
      try {
        ou = Bi.inject(
          cy
        ), ft = Bi;
      } catch {
      }
  }
  return un.createRoot = function(l, t) {
    if (!J(l)) throw Error(h(299));
    var a = !1, e = "", u = Gd, n = Xd, i = Qd;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (e = t.identifierPrefix), t.onUncaughtError !== void 0 && (u = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Y0(
      l,
      1,
      !1,
      null,
      null,
      a,
      e,
      null,
      u,
      n,
      i,
      $0
    ), l[Te] = t.current, Ff(l), new Ss(t);
  }, un.hydrateRoot = function(l, t, a) {
    if (!J(l)) throw Error(h(299));
    var e = !1, u = "", n = Gd, i = Xd, c = Qd, f = null;
    return a != null && (a.unstable_strictMode === !0 && (e = !0), a.identifierPrefix !== void 0 && (u = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Y0(
      l,
      1,
      !0,
      t,
      a ?? null,
      e,
      u,
      f,
      n,
      i,
      c,
      $0
    ), t.context = G0(null), a = t.current, e = yt(), e = Ji(e), u = Ma(e), u.callback = null, xa(a, u, e), a = e, t.current.lanes = a, ru(t, a), kt(t), l[Te] = t.current, Ff(l), new Hi(t);
  }, un.version = "19.3.1", un;
}
var cm;
function By() {
  if (cm) return _s.exports;
  cm = 1;
  function b() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b);
      } catch (N) {
        console.error(N);
      }
  }
  return b(), _s.exports = Hy(), _s.exports;
}
var dm = By();
function rm() {
  const b = window.OrbitalAdapter, N = It.useSyncExternalStore(b.subscribe, b.getMissionState);
  return { adapter: b, missionState: N };
}
const qy = () => {
  const { adapter: b, missionState: N } = rm(), [D, h] = It.useState(!1);
  return my.useEffect(() => {
    const J = document.getElementById("earth-canvas-container");
    if (J && typeof b.mountScene == "function") return b.mountScene("title", J);
  }, [b]), /* @__PURE__ */ o.jsxs(o.Fragment, { children: [
    /* @__PURE__ */ o.jsx("div", { id: "earth-canvas-container", "data-deck-viewport": !0, "aria-hidden": "true" }),
    /* @__PURE__ */ o.jsxs("section", { className: "title-screen", "aria-label": "Title and Mission Deck", children: [
      /* @__PURE__ */ o.jsxs("header", { className: "title-header", children: [
        /* @__PURE__ */ o.jsxs("span", { className: "title-brand", children: [
          "ORBITAL",
          /* @__PURE__ */ o.jsx("span", { children: "MISSION CONTROL" })
        ] }),
        /* @__PURE__ */ o.jsxs("nav", { "aria-label": "Game navigation", children: [
          /* @__PURE__ */ o.jsx("button", { onClick: b.openHangar, children: "Hangar" }),
          /* @__PURE__ */ o.jsx("button", { onClick: b.openAcademy, children: "Flight Academy" }),
          /* @__PURE__ */ o.jsx("button", { onClick: b.openReference, children: "Reference" }),
          /* @__PURE__ */ o.jsx("button", { onClick: b.openSettings, children: "Settings" })
        ] })
      ] }),
      /* @__PURE__ */ o.jsxs("main", { className: "title-content", children: [
        /* @__PURE__ */ o.jsx("p", { className: "title-kicker", children: "A SPACE MISSION DESIGN GAME" }),
        /* @__PURE__ */ o.jsx("h1", { children: "ORBITAL" }),
        /* @__PURE__ */ o.jsxs("p", { className: "title-intro", children: [
          "Build the spacecraft.",
          /* @__PURE__ */ o.jsx("br", {}),
          "Bring back the evidence."
        ] }),
        /* @__PURE__ */ o.jsx("p", { className: "title-description", children: "Design, launch and operate missions from Earth orbit to the edge of the Solar System." }),
        /* @__PURE__ */ o.jsx("div", { className: "title-actions", children: /* @__PURE__ */ o.jsxs(
          "button",
          {
            type: "button",
            className: "title-continue",
            "data-continue-campaign": "true",
            onClick: b.continueCampaign,
            children: [
              /* @__PURE__ */ o.jsx("span", { children: "Continue Campaign" }),
              /* @__PURE__ */ o.jsx(sm, { "aria-hidden": "true" })
            ]
          }
        ) }),
        N.notice && /* @__PURE__ */ o.jsx("p", { className: "title-notice", role: "status", children: N.notice })
      ] }),
      /* @__PURE__ */ o.jsxs("footer", { className: "title-footer", children: [
        /* @__PURE__ */ o.jsx("button", { onClick: () => h(!0), children: "About & credits" }),
        /* @__PURE__ */ o.jsx("span", { children: "EARTH · HOME PORT" })
      ] }),
      D && /* @__PURE__ */ o.jsx("div", { className: "title-about-backdrop", children: /* @__PURE__ */ o.jsxs(
        "section",
        {
          className: "title-about",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "title-about-heading",
          onKeyDown: (J) => {
            J.key === "Escape" && h(!1);
          },
          children: [
            /* @__PURE__ */ o.jsx("button", { className: "title-about-close", autoFocus: !0, onClick: () => h(!1), children: "Close" }),
            /* @__PURE__ */ o.jsx("h2", { id: "title-about-heading", children: "About ORBITAL" }),
            /* @__PURE__ */ o.jsx("p", { children: "Design a spacecraft, launch it and decide how to use its time, energy and communications." }),
            /* @__PURE__ */ o.jsx("p", { children: "Catch the Next Dip uses archived NASA Kepler photometry. The spacecraft, ascent and downlink use educational simulation models." }),
            /* @__PURE__ */ o.jsx("button", { onClick: b.openReference, children: "Browse observations and sources ↗" })
          ]
        }
      ) })
    ] })
  ] });
}, Yy = () => {
  const { adapter: b, missionState: N } = rm(), D = N.sharedEventPlot, h = Math.min(...D.map((B) => B.flux)), J = Math.max(...D.map((B) => B.flux)), I = Math.max(1e-4, (J - h) * 0.1), vl = h - I, Z = J + I, fl = D[0].hourOffset, _l = D[D.length - 1].hourOffset, M = (B) => 144 - 112 * (B - vl) / (Z - vl), T = (B) => 64 + 452 * (D[B].hourOffset - fl) / (_l - fl), H = D.map((B, gl) => `${T(gl)},${M(B.flux)}`).join(" ");
  return /* @__PURE__ */ o.jsxs(
    "section",
    {
      "aria-label": "Mission Brief and Ephemeris Prediction",
      className: "mission-brief",
      children: [
        /* @__PURE__ */ o.jsxs("header", { className: "mission-brief__header", children: [
          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__title-group", children: [
            /* @__PURE__ */ o.jsx("div", { className: "mission-brief__phase-tag", children: "Phase 01 · Mission Briefing & Ephemeris Prediction" }),
            /* @__PURE__ */ o.jsx("h1", { children: "Catch the Next Dip" }),
            /* @__PURE__ */ o.jsx("div", { className: "mission-brief__subtitle", children: "Target KIC 11446443 · Kepler long-cadence photometry" })
          ] }),
          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__header-actions", children: [
            /* @__PURE__ */ o.jsx(
              "button",
              {
                type: "button",
                onClick: () => b.toggleTimeSystemNote(),
                "aria-expanded": N.showingTimeSystemNote,
                className: "orbital-btn",
                children: N.showingTimeSystemNote ? "Hide Time System Note" : "Inspect Time System (BJD_TDB)"
              }
            ),
            /* @__PURE__ */ o.jsx(
              "button",
              {
                type: "button",
                onClick: b.returnToTitle,
                className: "orbital-btn",
                children: "Back to Deck"
              }
            )
          ] })
        ] }),
        N.showingTimeSystemNote && /* @__PURE__ */ o.jsxs("div", { role: "note", className: "mission-brief__time-note", children: [
          /* @__PURE__ */ o.jsxs("div", { children: [
            /* @__PURE__ */ o.jsx("strong", { children: "ARCHIVE TIME vs. FLIGHT T+: " }),
            "Candidate transit windows use Barycentric Julian Date (BJD_TDB) expressed in friendly UTC archive dates and relative hours. Ascent flight clock (",
            /* @__PURE__ */ o.jsx("span", { className: "font-telemetry", children: "T+00:00:00" }),
            ") begins only at pad liftoff."
          ] }),
          /* @__PURE__ */ o.jsx("span", { children: "Kepler Long-Cadence Archive" })
        ] }),
        /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__body", children: [
          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__evidence", children: [
            /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__evidence-header", children: [
              /* @__PURE__ */ o.jsxs("div", { children: [
                /* @__PURE__ */ o.jsx("div", { className: "mission-brief__panel-eyebrow", children: "Archive Reference" }),
                /* @__PURE__ */ o.jsx("h2", { children: "Observed Light Curve" })
              ] }),
              /* @__PURE__ */ o.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => b.toggleSharedEventExample(),
                  className: "orbital-btn",
                  style: { minHeight: "32px", padding: "4px 10px", fontSize: "12px" },
                  children: N.showingSharedExample ? "Hide Guide Overlay" : "Show Guide Overlay"
                }
              )
            ] }),
            /* @__PURE__ */ o.jsx("p", { className: "mission-brief__evidence-desc", children: "A dimmer reading drops lower on the vertical axis. To separate two competing ephemeris models, capturing only the central dip is insufficient—you must also return a baseline shoulder reading." }),
            /* @__PURE__ */ o.jsx("div", { className: "mission-brief__plot-wrap", children: /* @__PURE__ */ o.jsxs(
              "svg",
              {
                viewBox: "0 0 560 195",
                className: "w-full h-auto",
                role: "img",
                "aria-label": "Shared-event stellar light curve from the Kepler Q1 archive",
                children: [
                  /* @__PURE__ */ o.jsx("line", { x1: "56", y1: "32", x2: "530", y2: "32", stroke: "var(--orbital-border)", strokeWidth: "1" }),
                  /* @__PURE__ */ o.jsx("line", { x1: "56", y1: "88", x2: "530", y2: "88", stroke: "var(--orbital-border)", strokeWidth: "1", strokeDasharray: "3 3" }),
                  /* @__PURE__ */ o.jsx("line", { x1: "56", y1: "144", x2: "530", y2: "144", stroke: "var(--orbital-border)", strokeWidth: "1" }),
                  /* @__PURE__ */ o.jsx("text", { x: "48", y: "36", textAnchor: "end", fill: "var(--orbital-text)", fontSize: "10", fontFamily: "var(--font-telemetry)", children: Z.toFixed(4) }),
                  /* @__PURE__ */ o.jsx("text", { x: "48", y: "92", textAnchor: "end", fill: "var(--orbital-text-muted)", fontSize: "10", fontFamily: "var(--font-telemetry)", children: ((Z + vl) / 2).toFixed(4) }),
                  /* @__PURE__ */ o.jsx("text", { x: "48", y: "148", textAnchor: "end", fill: "var(--orbital-accent)", fontSize: "10", fontFamily: "var(--font-telemetry)", children: vl.toFixed(4) }),
                  /* @__PURE__ */ o.jsx(
                    "text",
                    {
                      x: "14",
                      y: "95",
                      textAnchor: "middle",
                      fill: "var(--orbital-text-dim)",
                      fontSize: "9",
                      fontFamily: "var(--font-telemetry)",
                      transform: "rotate(-90 14 95)",
                      children: "FLUX (DIMMER ↓)"
                    }
                  ),
                  /* @__PURE__ */ o.jsx(
                    "polyline",
                    {
                      fill: "none",
                      stroke: "var(--orbital-text)",
                      strokeWidth: "2",
                      points: H
                    }
                  ),
                  /* @__PURE__ */ o.jsxs("text", { x: "64", y: "176", fill: "var(--orbital-text-muted)", fontSize: "10", fontFamily: "var(--font-telemetry)", children: [
                    fl.toFixed(1),
                    " h"
                  ] }),
                  /* @__PURE__ */ o.jsxs("text", { x: "516", y: "176", fill: "var(--orbital-text-muted)", fontSize: "10", fontFamily: "var(--font-telemetry)", textAnchor: "end", children: [
                    "+",
                    _l.toFixed(1),
                    " h"
                  ] }),
                  D.map((B, gl) => {
                    const Kl = T(gl), rl = M(B.flux), Jl = N.showingSharedExample && B.isSharedDipWindow;
                    return /* @__PURE__ */ o.jsxs("g", { children: [
                      /* @__PURE__ */ o.jsx(
                        "circle",
                        {
                          cx: Kl,
                          cy: rl,
                          r: Jl ? 5 : 3.5,
                          fill: Jl ? "var(--orbital-accent)" : "var(--orbital-bg)",
                          stroke: Jl ? "var(--orbital-bg)" : "var(--orbital-text)",
                          strokeWidth: "1.5"
                        }
                      ),
                      /* @__PURE__ */ o.jsxs("title", { children: [
                        B.label,
                        " · ",
                        B.flux.toFixed(6),
                        " normalized flux"
                      ] })
                    ] }, B.label);
                  })
                ]
              }
            ) }),
            /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__plot-meta", children: [
              /* @__PURE__ */ o.jsx("span", { children: "Hours from shared event (132.646 BKJD)" }),
              /* @__PURE__ */ o.jsxs("span", { className: "mission-brief__plot-meta-low", children: [
                "Low: ",
                h.toFixed(5),
                " normalized flux"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__choices", children: [
            /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__panel", children: [
              /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__panel-header", children: [
                /* @__PURE__ */ o.jsxs("div", { children: [
                  /* @__PURE__ */ o.jsx("div", { className: "mission-brief__panel-eyebrow", children: "Your Prediction · Optional" }),
                  /* @__PURE__ */ o.jsx("h2", { children: "Competing Ephemeris Hypotheses" })
                ] }),
                /* @__PURE__ */ o.jsx("span", { className: `mission-brief__status-tag ${N.selectedTrackId ? "mission-brief__status-tag--selected" : "mission-brief__status-tag--muted"}`, children: N.selectedTrackId ? "Track Selected" : "No Prediction Selected" })
              ] }),
              /* @__PURE__ */ o.jsx(
                "div",
                {
                  role: "radiogroup",
                  "aria-label": "Prediction Tracks",
                  className: "mission-brief__hypotheses-grid",
                  children: N.predictionTracks.map((B) => {
                    const gl = N.selectedTrackId === B.id;
                    return /* @__PURE__ */ o.jsx(
                      "button",
                      {
                        type: "button",
                        role: "radio",
                        "aria-checked": gl,
                        onClick: () => b.selectPredictionTrack(B.id),
                        className: `mission-brief__card ${gl ? "mission-brief__card--selected" : ""}`,
                        children: /* @__PURE__ */ o.jsxs("div", { children: [
                          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__card-header", children: [
                            /* @__PURE__ */ o.jsx("span", { className: "mission-brief__card-title", children: B.teamName }),
                            /* @__PURE__ */ o.jsx("span", { className: "mission-brief__card-badge", children: gl ? "● Selected" : "Select" })
                          ] }),
                          /* @__PURE__ */ o.jsx("div", { className: "mission-brief__card-sub", children: B.modelCode }),
                          /* @__PURE__ */ o.jsx("p", { className: "mission-brief__card-desc", children: B.hypothesisSummary })
                        ] })
                      },
                      B.id
                    );
                  })
                }
              )
            ] }),
            /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__panel", children: [
              /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__panel-header", children: [
                /* @__PURE__ */ o.jsxs("div", { children: [
                  /* @__PURE__ */ o.jsx("div", { className: "mission-brief__panel-eyebrow", children: "Choose One Observation Window · Required" }),
                  /* @__PURE__ */ o.jsx("h2", { children: "Candidate Archive Observation Dates" })
                ] }),
                /* @__PURE__ */ o.jsx("span", { className: `mission-brief__status-tag ${N.selectedDateId ? "mission-brief__status-tag--selected" : "mission-brief__status-tag--warning"}`, children: N.selectedDateId ? "Date Selected" : "Action Required: Pick 1 Date" })
              ] }),
              /* @__PURE__ */ o.jsx(
                "div",
                {
                  role: "radiogroup",
                  "aria-label": "Candidate Observation Dates",
                  className: "mission-brief__dates-grid",
                  children: N.candidateDates.map((B) => {
                    const gl = N.selectedDateId === B.id;
                    return /* @__PURE__ */ o.jsxs(
                      "button",
                      {
                        type: "button",
                        role: "radio",
                        "aria-checked": gl,
                        onClick: () => b.selectCandidateDate(B.id),
                        className: `mission-brief__card ${gl ? "mission-brief__card--selected" : ""}`,
                        children: [
                          /* @__PURE__ */ o.jsxs("div", { children: [
                            /* @__PURE__ */ o.jsx("div", { className: "mission-brief__card-header", children: /* @__PURE__ */ o.jsx("span", { className: "mission-brief__card-title", children: B.archiveDate }) }),
                            /* @__PURE__ */ o.jsx("div", { className: "mission-brief__card-sub", children: B.relativeHours }),
                            /* @__PURE__ */ o.jsx("p", { className: "mission-brief__card-desc", children: B.visibilityWindow })
                          ] }),
                          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__card-footer", children: [
                            /* @__PURE__ */ o.jsx("span", { className: "truncate", children: B.ephemerisNote.split("·")[0] }),
                            /* @__PURE__ */ o.jsx("span", { className: gl ? "text-[var(--orbital-accent)] font-semibold" : "text-[var(--orbital-text-muted)]", children: gl ? "● Selected" : "○ Select" })
                          ] })
                        ]
                      },
                      B.id
                    );
                  })
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__settings-bar", children: [
          /* @__PURE__ */ o.jsxs("label", { children: [
            "Contact conditions:",
            /* @__PURE__ */ o.jsxs("select", { value: N.caseId, onChange: (B) => b.chooseCase(B.target.value), children: [
              /* @__PURE__ */ o.jsx("option", { value: "nominal", children: "Nominal · six packet slots" }),
              /* @__PURE__ */ o.jsx("option", { value: "timing", children: "Timing sensitivity · capture starts one hour later" }),
              /* @__PURE__ */ o.jsx("option", { value: "short", children: "Short contact · four packet slots" })
            ] })
          ] }),
          /* @__PURE__ */ o.jsxs("label", { children: [
            "Return policy:",
            /* @__PURE__ */ o.jsxs("select", { value: N.policy, onChange: (B) => b.choosePolicy(B.target.value), children: [
              /* @__PURE__ */ o.jsx("option", { value: "all", children: "All six readings" }),
              /* @__PURE__ */ o.jsx("option", { value: "bracket", children: "Bracket four · sample both sides of the window" })
            ] })
          ] })
        ] }),
        N.notice && /* @__PURE__ */ o.jsx("p", { role: "status", className: "mission-brief__notice", children: N.notice }),
        /* @__PURE__ */ o.jsxs("footer", { className: "mission-brief__footer", children: [
          /* @__PURE__ */ o.jsx("div", { className: "mission-brief__footer-status", children: N.selectedDateId ? /* @__PURE__ */ o.jsx("span", { className: "mission-brief__footer-status--selected", children: "Window selected: Ready to continue" }) : /* @__PURE__ */ o.jsx("span", { className: "mission-brief__footer-status--required", children: "Choose an observation window to continue" }) }),
          /* @__PURE__ */ o.jsxs("div", { className: "mission-brief__footer-actions", children: [
            /* @__PURE__ */ o.jsx(
              "button",
              {
                type: "button",
                disabled: !N.selectedDateId,
                onClick: b.useStarterSpacecraft,
                className: "orbital-btn",
                children: "Use editable starter"
              }
            ),
            /* @__PURE__ */ o.jsxs(
              "button",
              {
                type: "button",
                disabled: !N.selectedDateId,
                onClick: () => b.lockPredictionAndProceed(),
                className: "orbital-btn orbital-btn-primary",
                children: [
                  /* @__PURE__ */ o.jsx("span", { children: "Continue to spacecraft workshop" }),
                  /* @__PURE__ */ o.jsx(sm, { className: "w-4 h-4", "aria-hidden": "true" })
                ]
              }
            )
          ] })
        ] })
      ]
    }
  );
};
function Gy(b, N) {
  if (!window.OrbitalAdapter) throw new Error("Mission control adapter has not been initialized.");
  const D = dm.createRoot(b);
  return D.render(
    /* @__PURE__ */ o.jsx("div", { className: "orbital-root", "data-screen": N === "title" ? "menu" : "brief", children: N === "title" ? /* @__PURE__ */ o.jsx(qy, {}) : /* @__PURE__ */ o.jsx(Yy, {}) })
  ), () => D.unmount();
}
function Xy(b, N, D) {
  const h = dm.createRoot(b);
  return h.render(/* @__PURE__ */ o.jsx(Cy, { kind: N, controller: D })), () => h.unmount();
}
Object.assign(window, { mountOrbitalUI: Gy, mountOrbitalPanel: Xy });
export {
  Gy as mountOrbitalUI
};
