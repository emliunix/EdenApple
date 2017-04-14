
// test program

var code = 
["frame", ["halt"],
    ["constant", vm.V.int(1),
        ["argument",
            ["close", [vm.V.s("v")], ["refer", vm.V.s("v"), ["return"]],
                ["apply"]]]]]

var T = vm.T,
    V = vm.V,
    _primtypes = new Set([T.INT, T.BOOL, T.STRING, T.SYMBOL, T.NULL]),
    isPrimitive = ([type, _]) => _primtypes.has(type);

function printVal(val) {
    if(isPrimitive(val)) {
        return "" + V.toValue(val);
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
    if(null !== next) {
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