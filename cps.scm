
(define counter
  ((lambda ()
     (let [(i 0)]
       (lambda ()
	 (set! i (+ i 1))
	 i)))))

(define (mk-arg)
  (let [(p (open-output-string))
	(i (counter))]
    (display #\a p)
    (write i p)
    (string->symbol
     (get-output-string p))))

(define (mk-arg-fun)
  (let [(p (open-output-string))
	(i (counter))]
    (display #\p p)
    (write i p)
    (string->symbol
     (get-output-string p))))

(define (convert exp cont)
  (cond [(pair? exp)
	 (if (eq? (car exp) 'lambda)
	     (convert-lambda exp cont)
	     (convert-call exp cont))]
	[else `(,cont ,exp)]))

(define (convert-call exp cont)
  (let [(p (car exp))
	(args (cdr exp))
	(arg-p (mk-arg-fun))]
    (convert p
	     `(lambda (,arg-p)
	       ,(convert-args args `(,arg-p ,cont))))))

(define (convert-args args final)
  (if (null? args)
      final
      (let [(a (mk-arg))]
	(convert (car args)
		 `(lambda (,a)
		    ,(convert-args (cdr args)
				   (append final `(,a))))))))
