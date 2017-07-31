/**
 * LISP Expr:
 *
 * const val
 * ref symbol
 * let expr
 * define expr
 * if expr
 * lambda [symbol] expr
 * call expr
 */

(function (g) {

    const { V, C, U } = g.vm;

    function match(v, args, handlers, otherwise) {
        const h = handlers[v];
        if (typeof h === "function")
            return h.apply(null, args)
        else if (typeof otherwise === "function")
            return otherwise.apply(null, args)
        else
            throw new Error("no match.")
    }

    function lst_length(lst, length) {
        return lst[lst.length - 1] === V.NULL ?
            lst.length - 1 :
            lst.length;
    }

    function is_tail(next) {
        return next[0] === "return";
    }

    function assert(b, msg) {
        if (!b) {
            if (typeof msg === "function")
                msg = msg();
            throw new Error(msg);
        }
    }

    /*
     * instructions
     */
    const halt   = "halt",
        refer    = "refer",
        constant = "constant",
        close    = "close",
        test     = "test",
        assign   = "assign",
        conti    = "conti",
        nuate    = "nuate",
        frame    = "frame",
        argument = "argument",
        apply    = "apply",
        ireturn  = "return";

    /*
     * syntax expression stubs
     */

    function _c_quote(lst, next) {
        var [_, ctnt] = lst
        return [constant, U.arr_to_lst(ctnt), next]
    }

    function _c_if(lst, next) {
        let len = lst_length(lst) - 1; // lst length without the symbol if
        assert(len === 2 || len === 3, "invalid if expression")
        let [_, etest, ethen, eelse = V.NULL] = lst;
        return compile(etest, [test, compile(ethen, next), compile(eelse, next)])
    }

    function _c_let(lst, next) {
        assert(lst_length(lst) >= 3, "invalid let expression.")
        var [_, bindings, ...body] = lst;
        // bindings [ [ symbol expression] ... ]
        // check bindings
        assert(
            bindings
                .slice(0, bindings.length - 1)
                .every((b) => {
                    // binding is a 2 tuple
                    if (lst_length(b) !== 2) return false;
                    // the first one is a symbol
                    const [s, e] = b;
                    return C["symbol?"](s) === V.TRUE;
                }),
            "invalid bindings")
        // split bindings into vars and bindings
        const [vars, exprs] = bindings.slice(0, bindings.length - 1).reduce(([vars, exprs], [v, e]) => {
            vars.push(v)
            exprs.push(e)
            return [vars, exprs]
        }, [[], []])
        // convert into lambda form
        // ((lambda vars ...body ) ...exprs)
        return compile([[V.s("lambda"), vars].concat(body)].concat(exprs).concat([V.NULL]), next);
    }

    function _split_defines(lst) {
        function is_define(atom) {
            return C["symbol?"](atom) === V.TRUE
                && U.toJsValue(atom) === "define";
        }

        for (var i = 0; i < lst.length; ++i) {
            if (!is_define(lst[i])) break;
        }

        var defs;
        if (i === 0) // no defines
            defs = V.NULL
        else {
            defs = lst.slice(0, i)
            defs.push(V.NULL);
        }

        let body = lst.slice(i);

        assert(body.every(x => !is_define(x)),
            "compile error: invalid define statement");

        return [defs, body];
    }

    function _c_lambda(lst, next) {
        // defines occurs in toplevel lambda body
        // lst => [lambda vars ...body]

        // TODO: add define support
        //let [defs, body] = _split_defines(rest)
        assert(lst_length(lst) >= 3,
            "compile error: invalid lambda expression")
        const [_, vars, ...body] = lst;
        const new_body = lst_length(body) === 1 ? body[0] : [V.s("begin")].concat(body)
        return [
            close,
            vars,
            compile(new_body, [ireturn]),
            next];
    }

    function _c_begin(lst, next) {
        const [_, ...body] = lst;
        var c = next;
        for (var i = lst_length(body) - 1; i >= 0; i--) {
            c = compile(body[i], c)
        }
        return c;
    }

    function _c_set_(lst, next) {
        const [_, sym, expr] = lst;
        compile(expr, [assign, sym, next])
    }

    function _c_callcc(lst, next) {

    }

    function _c_call(lst, next) {
        const [fn, ...args] = lst;
        var c =  compile(fn, [apply])
        for (var i = lst_length(args) - 1; i >= 0; i-- ) {
            c = compile(args[i], [argument, c])
        }
        // 尾递归优化
        if(is_tail(next)) {
            return c
        } else {
            return [frame, next, c]
        }
    }

    function compile(lst, next) {
        // if lst is list
        // match on lst[0]
        // else // lst is an atom
        // if atom is a symbol -> ref
        // else const atom
        if (Array.isArray(lst) && !U.isLispVal(lst)) {
            let first = lst[0]
            if (C["symbol?"](first) === V.TRUE) {
                return match(U.toJsValue(first), [lst, next], {
                    "if": _c_if,
                    "lambda": _c_lambda,
                    "let": _c_let,
                }, _c_call)
            } else { // a plain call expression
                return _c_call(lst, next)
            }
        } else { // an atom
            if(C["symbol?"](lst) === V.TRUE)
                return [refer, lst, next]
            else
                return [constant, lst, next]
        }
    }

    function compile_top_level(lst, next) {
        return compile(lst, next);
    }

    g.compiler = {
        compile,
        compile_top_level
    };

})(this)
