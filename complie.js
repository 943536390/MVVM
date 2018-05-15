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
       return dir.indexOf("on:")!==-1 || dir.indexOf("@")!==-1;

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

                node.removeAttribute(attr);
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
         node.addEventListener('input', function() {
            vm[exp] = this.value;
        });
        this.bind(node, vm, exp, 'model');
    },

    bind: function(node, vm, exp, dir) {
       
        var updaterFn = updater[dir + 'Updater'];
        // 第一次初始化视图
        updaterFn && updaterFn(node, vm[exp]);
        // 实例化订阅者，此操作会在对应的属性消息订阅器中添加了该订阅者watcher
        new Watcher(vm, exp, function(value, oldValue) {
            // 一旦属性值有变化，会收到通知执行此更新函数，更新视图
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    for (node, vm, exp) {
        var self = this;
               var key = exp.split('in ')[1];
               var childName = exp.split(' in')[0];
               var lists = vm[key];
               var reg = /\{\{(.*)\}\}/;        
               var text = node.childNodes[0].textContent;
               var name = reg.exec(text)[1];
               // var tagName = node.nodeName;
               var parent = node.parentNode;

               Array.prototype.forEach.call(parent.childNodes, function (child) {
                   if(child.nodeName == "#text" && name === childName) {
                       parent.removeChild(child)
                   }
               })
               var startIndex = Array.prototype.indexOf.call(parent.childNodes, node)
               var nextNode = node.nextSibling

               if (name === childName) {
                   updater.listUpdater(parent, startIndex, nextNode, node, lists);
                   new Watcher(vm, key, function (value) {
                       updater.listUpdater(parent, startIndex, nextNode, node, value)
                   })
               }


    },

    eventHandler(node, vm, exp, dir) {
        dir = dir.split(":")[1];
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
    listUpdater: function (parent, start, nextNode, node, list) {
           var self = this;
           var exp, dir;
           Array.prototype.forEach.call(node.attributes, function (attr) {
               if (attr.name.indexOf('v-on') == 0 ) {
                   exp = attr.value;
                   dir = attr.name
               }
           })
           var end = Array.prototype.indexOf.call(parent.childNodes, nextNode);
           var length = end - start < 0 ? start+1 : end-start;
           for (var j=0; j<length; j++) {
               parent.removeChild(parent.childNodes[start])
           }

           var fragment = document.createDocumentFragment();
           for (var i=0; i<list.length; i++) {
               var textNode = document.createTextNode(list[i]);
               var ele = document.createElement('li');
               ele.appendChild(textNode);
               fragment.appendChild(ele);
               // if (exp) {
               //     var argu = exp.replace(/\(\w*\)/, '('+i+')')
               //     self.compileEvent(ele, self.vm, argu, dir)
               // }
           }
           if (end === -1) {
               parent.appendChild(fragment)
           } else {
               parent.insertBefore(fragment, nextNode)
           }
           
       },
    

};



