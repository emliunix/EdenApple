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

(function(g) {

    let {V,C} = g.vm;

    let _const = (atom) => []

    function match(v, args, handlers, otherwise) {
	let h = handlers[v];
	if(typeof h === "function")
	    h.apply(null, args)
	else if (typeof otherwise === "function")
	    otherwise.apply(null, args)
    }

    function lst_length(lst, length) {
        return lst[lst.length - 1] === V.NULL ?
            lst.length - 1 :
            lst.length;
    }

    function assert(b, msg) {
        if(!b) {
            if(typeof msg === "funtion")
                msg = msg();
            throw new Error(msg);
        }
    }

    /*
     * syntax expression stubs
     */

    function _c_quote(lst, next) {
	
    }

    function _c_if(lst, next) {
	
    }

    function _split_defines(lst) {
        function is_define(atom) {
            return C["symbol?"](atom) === V.TRUE
                && V.toValue(atom) === "define";
        }
	for(var i = 0; i < lst.length; ++i) {
            if(!is_define(lst[i])) break;
	}

        let defs = lst.slice(0, i);
        defs.push(V.NULL);

        let body = lst.slice(i);

        assert(body.every(x => !is_define(x)),
               "compile error: invalid define statement");
        
        return [defs, body];
    }

    function _c_lambda(lst, next) {
	// defines occurs in toplevel lambda body
	// lst => [lambda vars ...body]

        // TODO: add define support
        //let [defs, body] = _split_defines(lst)
        assert(lst_length(lst) > 3,
               "compile error: invalid lambda expression")
        let [_, vars, ...rest] = lst;
    }

    function _c_set_(lst, next) {
	
    }

    function _c_callcc(lst, next) {
	
    }

    function compile(lst, next) {
	// if lst is list
	// match on lst[0]
	// else // is an atom
	// if atom is a symbol -> ref
	// else const atom
	if(C["pair?"](lst) === V.TRUE) {
	    let first = lst[0]
	    if(C["symbol?"](first) === V.TRUE) {
		match(V.toValue(first), [lst, next], {
		    "if": ,
		    "lambda":,
		    
		});
	    } else { // a plain call expression
	    }
	}
    }
    
    g.compile = null;
})(this)
