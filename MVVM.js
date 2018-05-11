<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>data-binding-hijacking</title>
</head>

<body>
    <input v-model="value" type="text" id="input">
    <div id="el">{{value}}</div>
    <script>
    function observe(data) {
        if (!data || typeof data !== 'object') {
            return;
        }
        // 取出所有属性遍历
        Object.keys(data).forEach(function(key) {
            defineReactive(data, key, data[key]);
        });
    };

    function defineReactive(data, key, val) {
        var dep = new Dep();
        observe(val); // 监听子属性

        Object.defineProperty(data, key, {
            get: function() {
                // 由于需要在闭包内添加watcher，所以通过Dep定义一个全局target属性，暂存watcher, 添加完移除
                Dep.target && dep.addSub(Dep.target);
                return val;
            },
            set: function(newVal) {
                if (val === newVal) return;
                console.log('哈哈哈，监听到值变化了 ', val, ' --> ', newVal);
                val = newVal;
                dep.notify(); // 通知所有订阅者
            }
        });
    }

    function Dep() {
        this.subs = [];
    }
    Dep.prototype = {
        addSub: function(sub) {
            this.subs.push(sub);
        },
        notify: function() {
            this.subs.forEach(function(sub) {
                sub.update();
            });
        },

    };


    function Compile(el, vm) {
        this.$vm = vm;
        this.$el = this.isElementNode(el) ? el : document.querySelector(el);
        if (this.$el) {
            this.$fragment = this.node2Fragment(this.$el);
            this.init();
            this.$el.appendChild(this.$fragment);
        }
    }

    Compile.prototype = {
        init: function() { this.compileElement(this.$fragment); },
        node2Fragment: function(el) {
            var fragment = document.createDocumentFragment(),
                child;
            // 将原生节点拷贝到fragment
            while (child = el.firstChild) {
                fragment.appendChild(child);
            }
            return fragment;
        },
        isElementNode(el) {
            return el.nodeType === 1;
        },
        isTextNode(node) {
            return node.nodeType === 3;
        },
        isEventDirective(dir) {
            switch (dir) {
                case 'click':
                    return true;
                default:
                    return false;
            }

        },

        compileElement: function(el) {
            var childNodes = el.childNodes,
                me = this;
            [].slice.call(childNodes).forEach(function(node) {
                var text = node.textContent;
                var reg = /\{\{(.*)\}\}/; // 表达式文本
                // 按元素节点方式编译
                if (me.isElementNode(node)) {
                    me.compile(node);
                } else if (me.isTextNode(node) && reg.test(text)) {
                    me.compileText(node, RegExp.$1);
                }
                // 遍历编译子节点
                if (node.childNodes && node.childNodes.length) {
                    me.compileElement(node);
                }
            });
        },

        compile: function(node) {
            var nodeAttrs = node.attributes,
                me = this;
            [].slice.call(nodeAttrs).forEach(function(attr) {
                // 规定：指令以 v-xxx 命名
                // 如 <span v-text="content"></span> 中指令为 v-text
                var attrName = attr.name; // v-text
                if (me.isDirective(attrName)) {
                    var exp = attr.value; // content
                    var dir = attrName.substring(2); // text
                    if (me.isEventDirective(dir)) {
                        // 事件指令, 如 v-on:click
                        compileUtil.eventHandler(node, me.$vm, exp, dir);
                    } else {
                        // 普通指令
                        compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                    }
                }
            });
        },

        compileText(node, exp) {
            node.nodeValue = this.$vm[exp];
            new Watcher(this.$vm, exp, function(value, oldVal) {
                node.nodeValue = value;
            });
        },

        isDirective(attrName) {
            let pattern = /^v\-(.*)$/g;
            return pattern.test(attrName);
        }
    };

    // 指令处理集合
    var compileUtil = {
        model: function(node, vm, exp) {
            this.bind(node, vm, exp, 'model');
        },

        bind: function(node, vm, exp, dir) {
            node.addEventListener('input', function() {
                vm[exp] = this.value;
            });
            var updaterFn = updater[dir + 'Updater'];
            // 第一次初始化视图
            updaterFn && updaterFn(node, vm[exp]);
            // 实例化订阅者，此操作会在对应的属性消息订阅器中添加了该订阅者watcher
            new Watcher(vm, exp, function(value, oldValue) {
                // 一旦属性值有变化，会收到通知执行此更新函数，更新视图
                updaterFn && updaterFn(node, value, oldValue);
            });
        },

        eventHandler(node, vm, exp, dir) {
            let method = exp.substring(0, exp.indexOf("("));
            let params = exp.substring(exp.indexOf("(") + 1, exp.indexOf(")")).split(",");
            node.addEventListener(dir, function() {
                vm[method].apply(vm, params);
            });



        }
    };

    // 更新函数
    var updater = {
        modelUpdater: function(node, value) {
            node.value = typeof value == 'undefined' ? '' : value;
        },

    };


    function Watcher(vm, exp, cb) {
        this.cb = cb;
        this.vm = vm;
        this.exp = exp;
        // 此处为了触发属性的getter，从而在dep添加自己，结合Observer更易理解
        this.value = this.get();
    }
    Watcher.prototype = {
        update: function() {
            this.run(); // 属性值变化收到通知
        },
        run: function() {
            var value = this.get(); // 取到最新值
            var oldVal = this.value;
            if (value !== oldVal) {
                this.value = value;
                this.cb.call(this.vm, value, oldVal); // 执行Compile中绑定的回调，更新视图
            }
        },
        get: function() {
            Dep.target = this; // 将当前订阅者指向自己
            var value = this.vm[this.exp]; // 触发getter，添加自己到属性订阅器中
            Dep.target = null; // 添加完毕，重置
            return value;
        }
    };

    function MVVM(options) {
        this.$options = options;
        this._method = options.method || {};
        var data = this._data = this.$options.data || {},
            me = this;
        // 属性代理，实现 vm.xxx -> vm._data.xxx
        Object.keys(data).forEach(function(key) {
            me._proxy(key);
        });
        Object.keys(this._method).forEach(function(key) {
            me._proxy(key);
        });
        observe(data, this);
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
        }
    };


    let option = {
        data: {
            value: 'kindeng'
        }
    }
    let vm = new MVVM(option);

    setTimeout(() => {
        vm.value = 'a';

    }, 1000);
    console.log(vm.value);
    </script>
</body>

</html>