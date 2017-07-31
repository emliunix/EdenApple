(function(global) {
    // walk array
    function walk(arr, fn) {
        return arr.map((v) => Array.isArray(v) ? walk(v, fn) : fn(v))
    }

    // extend an environment
    function extend(env, vars, vals) {
        var rib = vars.slice(0, vars.length - 1).reduce(
            (acc, vari, i) => { acc[U.toJsValue(vari)] = vals[i]; return acc; },
            Object.create(null)
        )
        return [rib, env];
    }

    // lookup a variable in an environment
    function lookup(vari, env) {
        var v = U.toJsValue(vari)
        if(env == null) {
            throw new Error(`Variable ${v} not bound.`);
        }

        if(hasOwnProperty(env[0], v)) {
            return env[0][v];
        } else {
            return lookup(vari, env[1]);
        }
    }

    // assign value
    function assign_env(vari, val, env) {
        var v = V.toValue(vari);
        if(env == null) {
            throw new Error(`Assigning to undefined variable ${v}.`)
        }

        if(hasOwnProperty(env[0], v)) {
            env[0][v] = val;
        } else {
            assign(vari, val, env[1])
        }
    }

    // utilities
    function contains(set, el) {
        return set.some(v => v === el);
    }

    function hasOwnProperty(o, prop) {
        return Object.prototype.hasOwnProperty.call(o, prop)
    }

    function _lispval(v) {
        v._lisp_mark = true
        return v;
    }

    // The VM
    class VM {
        init(x) {
            // core environment
            // transform every fn in core into a lisp vlaue of type native
            const core_env = Object.entries(core)
                                   .reduce((o, [k, v]) => {o[k] = V.native(v); return o}, {});
            core_env._core_mark = true;

            this.a = V.NULL;
            this.x = x;
            this.e = [Object.create(null), [core_env, null]];
            this.r = [];
            this.s = null;
        }
        
        cycle() {
            var code = this.x[0];
            var operands = this.x.slice(1);
            return this[code].apply(this, operands);
        }

        // instrucitons

        halt() {
            return this.a;
        }

        refer(vari, x) {
            this.a = lookup(vari, this.e)
            this.x = x;
        }

        constant(val, x) {
            this.a = val;
            this.x = x;
        }

        close(vars, body, x) {
            this.a = V.closure(body, this.e, vars)
            this.x = x;
        }

        test(thenx, elsex) {
            if(core["eq?"](this.a, V.TRUE)) {
                this.x = thenx;
            } else {
                this.x = elsex;
            }
        }

        assign(vari, x) {
            assign_env(vari, this.a, this.e);
            this.x = x;
        }

        conti(x) {
            // not implemented.
        }

        nuate(s, vari) {
            this.a = lookup(vari, this.e)
            this.s = s;
            this.return();
        }

        frame(ret, x) {
            this.s = [ret, this.e, this.r, this.s]
            this.x = x;
            this.r = [];
        }

        argument(x) {
            this.r.push(this.a);
            this.x = x;
        }

        apply() {
            // an apply-able vaule could be a closure or a native funciton
            let [type] = this.a;
            if(type === T.NATIVE) {
                // native function
                this.a = Function.prototype.apply.apply(this.a[1], [this, this.r]);
                this.r = [];
                this.return();
            } else {
                // closure
                (function (_, body, env, vars) {
                    this.x = body;
                    this.e = extend(env, vars, this.r);
                    this.r = [];
                }).apply(this, this.a)
            }
        }

        return() {
            (function (x, e, r, s) {
                this.x = x;
                this.e = e;
                this.r = r;
                this.s = s;
            }).apply(this, this.s)
        }
    }

    // run a vm
    // cycleCB(vm, nextCycleCB)
    class Executor {
        constructor(vm, code) {
            this.vm = vm;
            this.vm.init(code);
            this.m_halt = false;
        }
        cycle() {
            this.m_halt = typeof (this.m_result = this.vm.cycle()) !== "undefined"
        }
        isHalt() {
            return this.m_halt;
        }
        result() {
            return this.m_result;
        }
    }

    // type enumeration
    const type = {
        SYMBOL: "SYMBOL",
        INT: "INT",
        BOOL: "BOOL",
        STRING: "STRING",
        NULL: "NULL",
        PAIR: "PAIR",
        CLOSURE: "CLOSURE",
        CONTI: "CONTI", // continuation
        NATIVE: "NATIVE" // native operations
    },
    // value cell :: [type, ...<value fields>]
    value = {
        // constants
        NULL: _lispval([type.NULL, null]),
        TRUE: _lispval([type.BOOL, true]),
        FALSE: _lispval([type.BOOL, false]),
        // constructors
        symbol: s => _lispval([type.SYMBOL, s]),
        int: i => _lispval([type.INT, i]),
        bool: b => b ? V.TRUE : V.FALSE,
        string: s => _lispval([type.STRING, s]),
        pair: (car, cdr) => _lispval([type.PAIR, car, cdr]),
        closure: (vars, env, body) => _lispval([type.CLOSURE, vars, env, body]),
        conti: () => 1,
        native: (v) => _lispval([type.NATIVE, v]),
    },
    // show functions,
    // convert lisp value to string representation
    Show = {
        "SYMBOL": (v) => v[1],
        "INT": (v) => "" + v[1],
        "BOOL": (v) => v[1] ? "#t" : "#f",
        "STRING": (v) => `"${v[1]}"`,
        "NULL": (_) => "()",
        "PAIR": (pair) => `(${walk(U.lst_to_arr(pair), U.show).join("")})`,
        "CLOSURE": (_) => "#closure",
        "CONTI": (_) => "#conti",
        "NATIVE": (v) => v[1].toString()
    },
    // Core
    // symbol? int? bool? string? null? pair? list?
    // 
    // cons car cdr 
    // + - * / %
    // 
    // eq? eqv? equal?
    core = {
        "int?": (v) => V.bool(v[0] === T.INT),
        "bool?": (v) => V.bool(v[0] === T.BOOL),
        "symbol?": (v) => V.bool(v[0] === T.SYMBOL),
        "string?": (v) => V.bool(v[0] === T.INT),
        "pair?": (v) => V.bool(v[0] === T.PAIR),
        "null?": (v) => V.bool(v === V.NULL || v[0] === T.NULL),
        "list?": (v) => V.bool(v[0] === T.PAIR || v === V.NULL),
        "eq?"(a, b) {
            if (a[0] === b[0]) {
                if (a[0] === T.NULL) {
                    return V.TRUE;
                } else if (contains([T.INT, T.BOOL, T.SYMBOL, T.STRING], a[0])) {
                    // primitive type
                    return a[1] === b[1] ? V.TRUE : V.FALSE;
                } else {
                    // compose value, referential equality
                    return a == b ? V.TRUE : V.FALSE;
                }
            }
            return V.FALSE;
        },
        cons(a, b) {
            return V.pair(a, b);
        },
        car(p) {
            return p[1];
        },
        cdr(p) {
            return p[2];
        },
        // math arithmetic
        "+"(...args) {
            return V.int([...args].map(U.toJsValue).reduce((a, v) => a + v, 0))
        },
        "-"(...args) {
            if(args.length === 1) {
                return V.int(-args[0][1])
            } else if(args.length > 1) {
                return V.int(args.map(U.toJsValue).reduce((a, v) => a - v))
            } else
                throw new Error("invalid - operation")
        },
        ">"(...args) {
            if (!(args.length >= 2)) {
                throw new Error("invalid > operation")
            }
            args = args.map(U.toJsValue)
            for (var i = 0; i < args.length - 1; ++i)
                if (!(args[i] > args[i+1]))
                    return V.FALSE;
            return V.TRUE;
        }
    },
    // Utility functions
    util = {
        arr_to_lst(lst) {
            if (lst.length === 0) return V.NULL
            // lst.length为1的情况不应该出现，为0也不应该出现，这里
            // 的lst应该是从parser中解析出的数组表示，这种情况下，
            // 长度至少为2。
            // 在parser中：
            // () -> NULL
            // (a b c) -> [a, b, c, NULL]
            // (a b . c) -> [a, b, c]
            else if (lst.length === 1) return V.pair(lst[0], V.NULL)
            else if (lst.length === 2) return V.pair(lst[0], lst[1])
            else {
                let [first, ...rest] = lst;
                return V.pair(first, arr_to_lst(rest))
            }
        },
        lst_to_arr(lst) {
            let [_, car, cdr] = lst,
                left = C["pair?"](car) ? lst_to_arr(car) : car;
                if(C["pair?"](cdr)) {
                    return [left].concat(lst_to_arr(cdr))
                } else {
                    return [left, cdr]
                }
        },
        show(v) {
            if(!Array.isArray(v) || v.length < 2)
                throw new Error(`${v} is not a valid lisp value.`)

            let showfn = Show[v[0]]
            if(typeof showfn === "function")
                return showfn(v)
            else
                return "#unknown value"
        },
        // to js value
        toJsValue(x) {
            if(contains([T.INT, T.BOOL, T.SYMBOL, T.STRING, T.NULL], x[0])) {
                return x[1]
            } else if (x[0] === T.PAIR) {
                return walk(U.lst_to_arr(x), toJsValue)
            } else {
                throw new Error("cannot convert value to js value.")
            }
        },
        isLispVal(v) {
            return v._lisp_mark ? true : false;
        }
    }
    T = type,
    V = value,
    C = core,
    U = util;

    // shorthand
    V.s = V.symbol;

    global.vm = {
        VM,
        type,T,
        value,V,
        core,C,
        util,U,
        Executor
    }
})(this);
