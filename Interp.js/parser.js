(function(g){
    /*
     * LispVal = symbol | number | bool | string | list of LispVal
     *
     * 使用vm.js中的V来构造数据
     */
    var symbolChars = "!?#$%&|+-*/:<=>@^_~";
    var blankChars = " \t\n\r";

    let {stream, C, N, F} = g.parsec;

    let {V} = g.vm;

    /* util */

    function _or([f, ...fr]) {
	if(1 === fr.length) {
	    return F.try(f).or(fr[0])
	} else {
	    return F.try(f).or(_or(fr))
	}
    }

    /* definition */
    
    var _symbolChar = C.charIn(symbolChars)
    var symbol = F.try(C.letter).or(_symbolChar) // first
        .then(F.try(C.letter).or(F.try(N.digit).or(_symbolChar)).optrep()) // rest
	.map(([first, rest=[]]) => V.s([first, rest.join("")].join("")))

    var bool = C.char("#")
	.thenRight(C.charIn("tf"))
	.map(x => ({"t": V.TRUE, "f": V.FALSE})[x])

    var _special_char = C.char("\\")
	.thenRight(_or(
	    [C.char("n").thenReturns(V.string("\n")),
	     C.char("t").thenReturns(V.string("\t")),
	     C.char("\"").thenReturns(V.string("\"")),
	     C.char("\\").thenReturns(V.string("\\"))]))

    var string = C.char("\"")
	.thenRight(F.try(_special_char)
		   .or(C.notChar("\""))
		   .optrep()
		   .map(xs => V.string(xs.join(""))))
	.thenLeft(C.char("\""))

    var _blankChars = C.charIn(blankChars).optrep()

    /**
     * 入口parser在此处定义，并采用惰性求值的方式，
     * 使得list的定义可以向上递归使用lisp的定义，
     * 构成一个互递归的结构
     */
    var lisp = F.lazy(
	() => _blankChars
	    .thenRight(_or(
		[bool,
		 N.integer.map(i => V.int(i)),
		 // bool and integer shall be parsed
		 // in precedence of symbol
		 symbol,
		 string,
		 list]))
    )

    var _list_tail = _blankChars.then(C.charIn(")]")).thenReturns(V.NULL)
    var _dotted_tail = _blankChars
	.then(C.char("."))
	.thenRight(lisp)
	.thenLeft(_list_tail)
    
    var list =
	C.charIn("([")
	.thenRight(
	    F.try(lisp.rep()
		  .then(F.try(_list_tail).or(_dotted_tail))
		  .map(([xs, tail]) => {xs.push(tail); return xs}))
	    // or empty list (null)
		.or(_list_tail))


    // g.lispParser = {
    // 	symbol,
    // 	bool,
    // 	string,
    // 	list,
    // 	_blankChars,
    // 	_list_tail,
    // 	_dotted_tail,
    // 	list
    // 	lisp
    // }
    g.lispParser = lisp
})(this)
