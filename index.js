class Vue {
    constructor (option) {
        this.$option = option;
        this._data = this.$option.data;
        Object.keys(this._data).forEach((key)=>{
            this.proxy(key);
            if(Array.isArray(this._data[key])){
                this.mutationMethod(key);
            }
        });



        new Observer(this._data);
        this.batcher = new Batcher();
    }

    proxy (key) {
        Object.defineProperty(this,key,{
            configurable: true,
            enumerable: true,
            get () {
                return this._data[key];
            },

            set (v) {
                this._data[key] = v;  
            }
        });
    }

    $watcher (exp,cb) {
        new Watcher(this,exp,cb);
    }

    mutationMethod (key) {
        const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
        const arrayAugmentations = [];
        let self = this;
        aryMethods.forEach(function(method){
           
           arrayAugmentations[method] = function(){
                    
                    let result = Array.prototype[method].apply(this,arguments);
                    let arr = this.slice(0);
                    arr.__proto__ = arrayAugmentations;
                    self._data[key] = arr;
                    return result;
                
            }
        }); 
        self._data[key].__proto__ = arrayAugmentations;

    }
    // 
    // mutationMethod (key) {
    //            var self = this;
    //            const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
    //            const arrayAugmentations = [];
    //            aryMethods.forEach((method)=> {
    //                // 这里是原生Array的原型方法
    //                let original = Array.prototype[method];

    //                // 将push, pop等封装好的方法定义在对象arrayAugmentations的属性上
    //                // 注意：是属性而非原型属性
    //                arrayAugmentations[method] = function () {
    //                    var result = original.apply(this, arguments)
    //                    var copyArr = this.slice(0);
    //                    copyArr.__proto__ = arrayAugmentations;

    //                    console.log('数组变动了！')
    //                    self._data[key] = copyArr

    //                    return result;
    //                };
    //            });
    //            self._data[key].__proto__ = arrayAugmentations;
    //        }
}

function nextTick  ()   {
    var callbacks = [];   // 缓存函数的数组
    var pending = false;  // 是否正在执行
    var timerFunc;  // 保存着要执行的函数

    function nextTickHandler () {
      pending = false;
      //  拷贝出函数数组副本
      var copies = callbacks.slice(0);
      //  把函数数组清空
      callbacks.length = 0;
      // 依次执行函数
      for (var i = 0; i < copies.length; i++) {
        copies[i]();
      }
    }

    if (typeof Promise !== 'undefined' ) {
      var p = Promise.resolve();
      // var logError = function (err) { console.error(err); };
      timerFunc = function () {
        p.then(nextTickHandler);
       
      };
    }
    else if (typeof MutationObserver !== 'undefined') {

      var counter = 1;
      var observer = new MutationObserver(nextTickHandler);
      var textNode = document.createTextNode(String(counter));
      observer.observe(textNode, {
        characterData: true
      });
      timerFunc = function () {
        counter = (counter + 1) % 2;
        textNode.data = String(counter);
      };
    }
    else {
        timerFunc = function () {
          setTimeout(nextTickHandler, 0);
        };
      }

    return function queueNextTick (cb, ctx) {
        var _resolve;
        callbacks.push(function () {
          if (cb) { cb.call(ctx); }
          if (_resolve) { _resolve(ctx); }
        });
        // 如果没有函数队列在执行才执行
        if (!pending) {
          pending = true;
          timerFunc();
        }
        // promise化
        if (!cb && typeof Promise !== 'undefined') {
          console.log('进来了')
          return new Promise(function (resolve) {
            _resolve = resolve;
          })
        }
      }


};


var nextTick = nextTick();