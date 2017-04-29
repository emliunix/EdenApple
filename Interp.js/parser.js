(function(g){
    var symbolChars = "!?#$%&|+-*/:<=>@^_~";
    var blankChars = " \t\n\r";

    let {stream, C, N, F} = g.parsec;
    
    var _symbolChar = C.charIn(symbolChars)
    var symbol = F.try(C.letter).or(_symbolChar) // first
        .then(F.try(C.letter).or(F.try(N.digit).or(_symbolChar)).optrep()) // rest
	.map(([first, rest=[]]) => [first, rest.join("")].join(""))

    var bool = C.char("#")
	.thenRight(C.charIn("tf"))
	.map(x => ({"t": true, "f": false})[x])

    var _special_char = C.char("\\")
	.thenRight(F.try(C.char("n").thenReturns("\n"))
		   .or(C.char("t").thenReturns("\t"))
		   .or(C.char("\"").thenReturns("\""))
		   .or(C.char("\\").thenReturns("\\")))

    var string = C.char("\"")
	.thenRight(F.try(_special_char)
		   .or(C.notChar("\""))
		   .optrep()
		   .map(xs => xs.join("")))
	.thenLeft(C.char("\""))

    var _blankChars = C.charIn(blankChars).optrep()

    var lisp = F.lazy(
	() => _blankChars
	    .thenRight(F.try(bool)
		       .or(symbol)
		       .or(string)
		       .or(N.integer)
		       .or(list))
    )

    var _list_tail = _blankChars.then(C.char(")")).thenReturns(null)
    var _dotted_tail = _blankChars
	.then(C.char("."))
	.thenRight(lisp)
	.thenLeft(_list_tail)
    
    var list =
	C.char("(")
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
