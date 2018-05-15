
    function MVVM(options) {
        this.$options = options;
        this._method = options.method || {};
        var data = this._data = this.$options.data || {},
            me = this;
        // 属性代理，实现 vm.xxx -> vm._data.xxx
        Object.keys(data).forEach(function(key) {
            me._proxy(key);
            if(Array.isArray(data[key])){
              me.mutationMethod(key);
            }
        });
        Object.keys(this._method).forEach(function(key) {
            me._proxy(key);
        });
        new Observer(data, this);
        this.$compile = new Compile(options.el || document.body, this)
    }

    MVVM.prototype = {
        _proxy: function(key) {
            var me = this;
            Object.defineProperty(me, key, {
                configurable: false,
                enumerable: true,
                get: function proxyGetter() {
                    return me._data[key];
                },
                set: function proxySetter(newVal) {
                    me._data[key] = newVal;
                }
            });
        },

        mutationMethod: function (key) {
               var self = this;
               const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
               const arrayAugmentations = [];
               aryMethods.forEach((method)=> {
                   // 这里是原生Array的原型方法
                   let original = Array.prototype[method];

                   // 将push, pop等封装好的方法定义在对象arrayAugmentations的属性上
                   // 注意：是属性而非原型属性
                   arrayAugmentations[method] = function () {
                       var result = original.apply(this, arguments)
                       var copyArr = this.slice(0);
                       copyArr.__proto__ = arrayAugmentations;

                       console.log('数组变动了！')
                       self._data[key] = copyArr

                       return result;
                   };
               });
               self._data[key].__proto__ = arrayAugmentations;
           }
    };


    let option = {
      el: '#app',
        data: {
            value: 'kindeng',
            items: [1,2,3]
        }
    }
    let vm = new MVVM(option);

    setTimeout(() => {
      // vm.value='a';
        vm.items.push(4);

    }, 1000);
    console.log(vm.value);
   