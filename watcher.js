class Watcher {
    constructor (vm,exp,cb) {
        this.watcherId = "watcher"+wacherCount++;
        this.id = {};
        this.vm = vm;
        this.exp = exp;
        this.cb = cb;
        this.value = this.get();
    }

    get () {
        Dep.target = this;
        let value = this.vm[this.exp];
        Dep.target = null;
        return value;
    }

     addDep(dep) {
          // 如果在depIds的hash中没有当前的id,可以判断是新Watcher,因此可以添加到dep的数组中储存
          // 此判断是避免同id的Watcher被多次储存
          if (!this.id.hasOwnProperty(dep.id)) {
            dep.sub(this);
            this.id[dep.id] = dep;
          }
        }

    update () {
        this.vm.batcher.push(this);
        //this.run();
    }

    run () {
        let oldValue = this.value;
        let newValue = this.get();
        if(oldValue!==newValue){
            this.value = newValue;
            this.cb.call(this.vm,newValue,oldValue); 
        }
        
    }


}

var wacherCount=1;
class Batcher {
    constructor () {
        this.reset();
    }
    reset () {
        this.queue = [];
        this.has = {};
        this.waiting = false;
    }

    push (watcher) {
        console.log(this.has[watcher.watcherId]);
        if(!this.has[watcher.watcherId]){
            this.has[watcher.watcherId] = watcher;
            this.queue.push(watcher);
            if(!this.waiting){
                this.waiting = true;
                // setTimeout(()=>{
                //     this.flush();
                // },0)
                nextTick(this.flush,this);
            }
        }

        
    }

    flush() {
        this.queue.forEach((watcher)=>{
            watcher.run();
        });
        this.reset();
    }
}