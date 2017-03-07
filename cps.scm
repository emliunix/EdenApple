

(define (mk-arg i)
  (let [(p (open-output-string))]
    (display #\a p)
    (write i p)
    (string->symbol
     (get-output-string p))))

(symbol->string (mk-arg 1))

(define (convert exp cont)
  (cond [(pair? exp)
	 (if (eq? (car exp) 'lambda)
	     (convert-lambda exp cont)
	     (convert-call exp cont))]
	[else `(,cont ,exp)]))

(define (convert-call exp cont)
  (let [(p (car exp))
	(args (cdr exp))]
    (convert p
	     `(lambda (p)
	       ,(convert-args args 1 `(p ,cont))))))

(define (convert-args args arg-index final)
  (if (null? args)
      final
      (let [(a (mk-arg arg-index))]
	(convert (car args)
		 `(lambda (,a)
		    ,(convert-args (cdr args)
				  (+ arg-index 1)
				  (append final `(,a))))))))
