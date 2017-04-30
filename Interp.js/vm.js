(function(global) {

    // extend an environment
    function extend(env, vars, vals) {
        var rib = vars.reduce(
            (acc, vari, i) => { acc[V.toValue(vari)] = vals[i]; return acc; },
            Object.create(null)
        )
        return [rib, env];
    }

    // lookup a variable in an environment
    function lookup(vari, env) {
        var v = V.toValue(vari)
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

    // The VM
    class VM {
        init(x) {
            this.a = V.NULL;
            this.x = x;
            this.e = [Object.create(null), null];
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
            if(core["eq?"](a, V.TRUE)) {
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
                apply(this.a[1], this, this.r);
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
            return this.m_halt;;
        }
        result() {
            return this.m_result;
        }
    }

    // Core
    // symbol? int? bool? string? null? pair? list?
    // 
    // cons car cdr 
    // + - * / %
    // 
    // eq? eqv? equal?

    // value cell :: [type, value]
    // type :: int, bool, null, string, symbol, cons

    // type = [ "SYMBOL", "INT", "BOOL", "NULL", "PAIR" ].map(function(v) { this[v] = v; }, Object.create(null));
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
    value = {
        // constants
        NULL: [type.NULL, null],
        TRUE: [type.BOOL, true],
        FALSE: [type.BOOL, false],
        // constructors
        symbol: s => [type.SYMBOL, s],
        int: i => [type.INT, i],
        bool: b => b ? V.TRUE : V.FALSE,
        string: s => [type.STRING, s],
        pair: (car, cdr) => [type.PAIR, car, cdr],
        closure: (vars, env, body) => [type.CLOSURE, vars, env, body],
        conti: () => xx,
        native: () => xx,
        // to js value
        toValue(x) {
            if(contains([T.INT, T.BOOL, T.SYMBOL, T.STRING, T.NULL], x[0])) {
                return x[1]
            } else if (x[0] === T.PAIR) {
                return [toValue(C.car())]
            } else {
                throw new Error("Unconvertable value.")
            }
        }
    },
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
                } else if (conatains([T.INT, T.BOOL, T.SYMBOL, T.STRING], a[0])) {
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
        }
    },
    T = type,
    V = value,
    C = core;

    // shorthand
    V.s = V.symbol;

    global.vm = {
        VM,
        type,T,
        value,V,
        core,C,
        Executor
    }
})(this);
