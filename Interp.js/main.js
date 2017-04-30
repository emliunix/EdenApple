
// test program
/*
((lambda (v) v) 1)
*/

(function(g) {
    const {T,U,V} = g.vm;

    var code = 
    ["frame", ["halt"],
        ["constant", V.int(1),
            ["argument",
                ["close", [V.s("v")], ["refer", V.s("v"), ["return"]],
                    ["apply"]]]]]

    const _primtypes = new Set([T.INT, T.BOOL, T.STRING, T.SYMBOL, T.NULL]),
        isPrimitive = ([type, _]) => _primtypes.has(type);

    function printVal(val) {
        if(isPrimitive(val)) {
            return "" + U.toJsValue(val);
        } else {
            return `non printable value of type ${val[0]}`;
        }
    }

    function printEnv([cur, next]) {
        var msg = "";
        for (let name of Object.getOwnPropertyNames(cur)) {
            msg += `${name} = ${printVal(cur[name])}\n`;
        }
        msg += "---\n";
        if(null !== next && !next[0]._core_mark) {
            msg += printEnv(next)
        }
        return msg;
    }

    function printVM(vm) {
        var msg = "Accumulator:\n";
        msg += printVal(vm.a) + "\n";
        msg += "Next Expression:\n";
        msg += `${vm.x[0]}\n`;
        msg += "Environment:\n";
        msg += printEnv(vm.e);
        msg += "Currnet Rib:\n";
        msg += vm.r.map(x => printVal(x)).join("\n");
        console.log(msg);
    }


    var v = new vm.VM(),
        e = new vm.Executor(v, code);

    function run() {
        printVM(v);
        while(!e.isHalt()) {
            e.cycle()
            printVM(v);
        }
        printVal(e.result())
    }

    function runCode(c) {
        const v = new g.vm.VM(),
            e = new g.vm.Executor(v, c);
        printVM(v);
        while(!e.isHalt()) {
            e.cycle();
            printVM(v);
        }
        console.log("Final result => " + printVal(e.result()))
    }

    function compilerTest() {
        const {stream} = g.parsec;
        const {compile} = g.compiler;
        const code = 
`
((lambda (x)
   (if (> x 0)
     x
     (- x)))
 (+ 1 2))
`;
        var p = lispParser.parse(stream.ofString(code))
        var c = compile(p.value, ["halt"])
        return c;
    }

    function _eq(v1, v2) {
        if(Array.isArray(v1) ) {
            return v1.every((v, idx) => _eq(v, v2[idx]))
        } else {
            return v1 === v2
        }
    }

    function test(code, next, asm) {
        let {stream} = g.parsec;
        const real_asm = g.compiler.compile(g.lispParser.parse(stream.ofString(code)).value, next)
        if(!_eq(real_asm, asm)) {
            throw new Error("test failed")
        }
    }
test(
`
a
`,
["halt"],
["refer", V.s("a"), ["halt"]])

test(
`
123
`,
["halt"],
["constant", V.int(123), ["halt"]])

test(
`
(a b "c")
`,
["halt"],
["frame", ["halt"],
  ["refer", V.s("b"),
    ["argument",
      ["constant", V.string("c"),
        ["argument",
          ["refer", V.s("a"),
            ["apply"]]]]]]])

test(
`
(a b "c")
`,
["return"],
["refer", V.s("b"),
    ["argument",
      ["constant", V.string("c"),
        ["argument",
          ["refer", V.s("a"),
            ["apply"]]]]]])


    g.main = {
        compilerTest,
        test,
        run,
        runCode
    }
})(this);