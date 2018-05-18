class Observer {
    constructor (data) {
        this.data = data;
        this.walk(data);
    }

    walk (data) {
        Object.keys(data).forEach(key => this.convert(key, data[key]));
    }

    convert (key,val) {
        const dep = new Dep();
        let chlidOb = observer(val);
        Object.defineProperty(this.data,key,{
            configurable: true,
            enumerable: true,
            get () {
                
                if(Dep.target!==null){
                    //dep.sub(Dep.target);
                    dep.depend();
                }
                return val;
            },

            set (v) {

                val = v;
                observer(val);
                dep.notify();
            }
        });
    }

    

}

function observer (data) {
        if(data === null  || typeof data !== 'object' || Array.isArray(data)){
            return;
        }

        return new Observer(data);
    }

var uid = 1;
class Dep {
    constructor () {
        this.queue = [];
        this.id = uid++;
    }

    sub (watcher) {
        this.queue.push(watcher);
    }

     // 触发target上的Watcher中的addDep方法,参数为dep的实例本身
    depend() {
      Dep.target.addDep(this);
    }

    notify () {
        this.queue.forEach((watcher)=>{
            watcher.update();
        });
    }

    remove (watcher) {
        for(let i=0,len=arguments.length;i<len;i++){
            let index = this.queue.indexOf(arguments[i]);
            if(index===-1){
                continue;
            }

            this.queue.splice(index,1);
        }
        
    }
}