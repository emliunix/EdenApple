# EdenApple
An interpreter for a subset of Scheme.

EdenApple是一个实验性质的解释器实现，准备用Scheme实现。

## 记录

这个解释器是我的毕业设计。至于为什么要实现一个解释器呢，没什么理由，就是想动手写一个解释器出来。

Lisp语言本身就以语法规则简单出名，这样也能够降低难度。毕竟是第一次尝试写一个解释器，要是写了半天写不出来那就GG了。

一个简单的解释器实现并没有多少行代码，在ChezScheme的示例代码中就有一个文件实现了一个解释器。在知乎上也看到过两个解释器的实现。但是自己手写还是有点难度的，简单阅读了一些资料之后，选取了几个基本上是核心的Feature专门研究，包括：

- Lexical Scope，
- Closure，
- Continuation。

Lexical Scope和Closure，感觉是同一个Feature，Closure作为实现手段提供了Lexical Scope这么一个能力。这一部分还是比较容易理解的。

首先，每一处具有变量绑定的地方都创建一个Env作为符号到值的查找表。而具有变量绑定的地方有最开始的全局环境(Global)，每一次的函数调用，以及let语句。每一个Env在创建的时候都与其(词法层面上的)父一级连接。这样，在查找变量的时候从最近一级的Env沿着这个Env的链条向上查找即可。而Closure的含义就是在创建函数(λ Abstraction)的时候，将这个函数对象额外附上指向词法上父一级的Env，或者说创建函数时的当前Env。当这个函数被调用时，将调用时的Env(持有实参的Env)指向这个创建时附加上的Env。

Closure仅在函数定义中存在_自由变量_(free variable)的时候才有用处。因为仅在函数中存在自由变量的时候才有可能查找父一级的Env，像`+, -, *, /`这种就不可能用到自由变量，也就不需要闭包，**不知道这个能不能作为一个优化的场景**。

Continuation个人感觉是对程序执行过程的一种看法，观察的角度，或者说模型。研究这个主要是想在解释器中运用_CPS_(Continuation Passing Style)，需要注意的是，Continuation和CPS是两个东西。Continuation是一种模型，而CPS是将程序变换为一种统一的形式(CP)，这种形式可以当作是IR(Intermediate Representation)一样的存在。在知乎上也看到过CPS类似于Monad，SSA的说法，同时也提到CPS可以再转换为ANF，虽然我还不知道ANF是什么样子的。SPJ也提出过joint-point这么一个东西，似乎也是一个IR

首先说Continuation，Continuation将程序的执行过程分成了两个部分，当前正在计算的(redex)和接下来要执行的(continuation)。一个continuation中存在这需要填入值的部分，叫做_hole_，翻译过来叫做洞，听起来比较怪，还是用英文算了。当redex计算完成后便将计算结果填入这个hole，那么continuation便可以进行接下来的计算，而接下来的计算过程也是计算一个redex，填入下一个continuation，这么一个过程。

```lisp
(- 4 (+ 1 2))
; =>
'((1 2)  (+ [] []) (- 4 []))
```

CPS的含义是将Continuation作为一个函数显示的传入当前的计算中。转换起来太难看了，而且我也不知道怎么公理化这个过程和证明CPS能够保证所有情况下都能进行。

不过关于CPS，这里还是可以记录下来一些东西。

### `if`和CPS

Lisp中的`if`是一个语法式而不是一个函数，`if`接收三个子式，当第一个为真时，eval第二个子式，否则eval第三个子式。如果`if`是一个函数，那么必然会首先将三个子式都先求值，这个语义就和`if`的本意冲突了，而且这种冲突会造成相当严重的后果，比如本来只会选择其中一条路径来进行求值，并在过程中产生副作用，现在两条路径的副作用都产生了，典型的例子是根据输入选择输出`"Hello"`还是`"You're so beautiful."`。或者在递归求值的情况下通常通过`if`来判断是否继续递归，那么函数`if`就没办法适用。

这种情况下可以把`if`看成是一个接收三个continuation的函数，首先求值第一个continuation，并根据结果选择下一个求值的continuation。



### Lisp 1.5

2017/03/05

简单扫了一下Lisp 1.5的手册，前面讲到Lisp是一个**Formal mathematical language**。看完了核心的语言的定义部分，也没有看到关于运行时相关的东西，估计真的是一个_mathematical language_吧。不过这本册子又叫做**LISP 1.5 Programmers Manual**这个就纠结了。

在前面定义中，不仅定义了S-expression，还定义了M-expression。形式化定义如下（**Backus notation**）：

```
<LETTER>::=A|B|C|...|Z
<number>::=0|1|2|...|9
<atomic symbol>::=<LETTER><atom part>
<atom part>::=<empty>|<LETTER><atom part>|<number><atom part>
<S-expression>::=<atomic symbol>|
                 (<S-expression>.<S-expression>)|
                 (<S-expression>...<S-expression>)

<letter>::=a|b|c|...|z
<identifier>::=<letter><id part>
<id part>::=<empty>|<letter><id part>|<number><id part>
<form>::=<constant>|
         <variable>|
         <function>[<argument>;...;<argument>]|
         [<form>-><form>;...;<form>-><form>]
<constant>::=<S-expression>
<variable>::=<identifier>
<argument>::=<form>
<function>::=<identifier>|
             λ[<var list>;<form>]|
             label[<identifier>;<function>]
<var list>::=[<variable>;...;<variable>]
```

按照册子上说的，M-expression是用来操作S-expression的，S-expression本身是一种符号数据的表达方式，而M-expression作为一种meta language，提供了函数定义，变量，条件表达式，函数调用的能力。然后M-expression本身作为一种表达式，也算是数据的一种形式，那么也就可以通过灵活的S-expression来表示出来。于是，册子中的1.6节定义了将M-expression转换为S-expression表达的转换过程。

随后通过S-expression表达的M-expression提供了常用函数的定义。

需要注意的是，M-expression提供了5个基本函数，`cons, car, cdr, eq, atom`。这5个函数提供了操作S-expression的基本操作。

