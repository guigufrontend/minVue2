function defineReactive(obj, key, value){
    // 创建Dep实例， 每个key都有同一个dep
    const dep = new Dep()

    // 如果属性对应的值是对象， 那么对这个对象继续响应式
    if(typeof value === 'object'){
        observe(value)
    }
    Object.defineProperty(obj, key, {
        get(){
            console.log('get', key)
            Dep.target&&dep.addDep(Dep.target)
            return value
        },
        set(v){
            if(v!==value){
                console.log('set', key)

                // 闭包
                value = v
                // 如果新数据是对象，递归响应式
                if(typeof v ==='object'){
                    observe(v)
                }
                dep.notify()
            }
        }
    })
}
const originalProto = Array.prototype;
const arrayProto = Object.create(originalProto)

function observe(obj){
    if(typeof obj !== 'object'||obj==null){
        return obj
    }
    new Observer(obj)    
}

// 代理vue实例上的数据
function proxy(vm){
    Object.keys(vm.$data).forEach(key=>{
        Object.defineProperty(vm, key,{
            get(){
                return vm.$data[key]
            },
            set(v){
                vm.$data[key] = v
            }
        })
    })
}



// 修改数组备份
['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice'].forEach(method=>{
    arrayProto[method]=function(){
        originalProto[method].apply(this, arguments)
        // 添加更新dom的操作
    }
})

// observer类， 每个响应式数据都是一个observer的实例
class Observer{
    constructor(obj){
        // 判断obj的类型
        if(Array.isArray(obj)){
            //  array
            // 覆盖原型，替换数组7个变更操作
            obj.__proto__ = arrayProto
            obj.forEach(item=>{
                new Observer(item)
            })
        }else{
            this.walk(obj)
        }
    }
    walk(obj){
        Object.keys(obj).forEach(key=>{
            defineReactive(obj, key, obj[key])
        })
    }
}
class Compile{
    constructor(el, vm){
        this.$vm = vm
        this.$el = document.querySelector(el)

        if(this.$el){
            this.compile(this.$el)
        }
    }
    // 遍历节点， 判断节点类型
    compile(node){
        const childNodes = node.childNodes
        childNodes.forEach(n=>{
            // 子元素是否是元素
            if(this.isElement(n)){
                // console.log('元素', n.nodeName)
                this.compileElement(n)
                if(n.hasChildNodes()){
                    this.compile(n)
                }
            }else if(this.isInter(n)){
                // 动态插值表达式
                this.compileText(n)
                // console.log('文本', n.textContent)
            }
        })
    }
    isElement(node){
        return node.nodeType === 1
    }
    // 是否是插值表达式
    isInter(node){
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }
    compileText(n){
        this.update(n, 'text', RegExp.$1)
    }
    compileElement(n){
        const attrs = n.attributes;
        Array.from(attrs).forEach(attr=>{
            const attrName = attr.name
            const exp = attr.value
            // 判断是否是指令
            if(this.isDirective(attrName)){
                const dir = attrName.substring(2)
                this[dir]?.(n, exp)
            }
            // 事件
            if(this.isEvent(attrName)){
                const dir = attrName.substring(1)
                // 事件监听
                this.eventHander(n, exp, dir)
            }
        })
    }
    isEvent(name){
        return name.indexOf('@') === 0
    }
    // 是否是指令
    isDirective(name){
        return name.startsWith('k-')
    }
    // 所有指令和插值表达式都要执行update方法，统一位置新建watcher
    update(node, dir, exp){
        // 第一次给dom赋值
        const fn = this[dir+'Updater']
        fn?.(node, this.$vm[exp])

        // 创建一个watcher， 用来更新dom中的值
        new Watcher(this.$vm, exp, (value)=>{
            fn?.(node, value)
        })
    }
    // text指令的处理方法
    text(node, exp){
        this.update(node, 'text', exp)
    }
    // html指令的处理方法
    html(node, exp){
        this.update(node, 'html', exp)
    }
    // 双向绑定实现
    model(node, exp){
        // 完成给dom赋值
        this.update(node, 'model', exp)
        // 事件监听
        // 还需要严谨的判断表单元素的类型
        // input 监听input， check监听check等
        node.addEventListener('input', (e)=>{
            this.$vm[exp] = e.target.value
        })
    }
    // 事件处理
    eventHander(node, exp, dir){
        const fn = this.$vm.$options.methods?.[exp]
        // 注意bind， 事件处理函数中的this一定是vue实例
        node.addEventListener(dir, fn.bind(this.$vm))
    }
    modelUpdater(node, value){
        // 这里需要看node是什么表单元素
        // input 是vlaue
        // checkbox 是check
        node.value = value
    }
    //text指令的真实处理
    textUpdater(node, value){
        node.textContent = value
    }
    //html指令的真实处理
    htmlUpdater(node, value){
        node.innerHTML = value
    }
}

class Watcher{
    constructor(vm, key , updater){
        this.vm = vm
        this.key = key
        this.updater = updater

        // 触发get
        Dep.target = this
        this.vm[this.key]
        Dep.target = undefined
    }

    update(){
        this.updater.call(this.vm, this.vm[this.key])
    }
}

class PxVue{
    constructor(options){
        this.$options = options
        this.$data = options.data
        // 对data做响应式处理
        observe(this.$data);

        // 代理data中的数据到vue实例上
        proxy(this)
        // 编译
       new Compile(options.el, this)
    }
}

// 保存watcher实力的依赖类
class Dep{
    constructor(){
        this.deps = []
    }
    // 添加watcher到deps
    addDep(dep){
        this.deps.push(dep)
    }
    // 通知依赖中保存的watcher去更新DOM
    notify(){
        this.deps.forEach(dep=>dep.update())
    }
}