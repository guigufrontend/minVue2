function defineReactive(obj, key, value){
    // 如果属性对应的值是对象， 那么对这个对象继续响应式
    if(typeof value === 'object'){
        observe(value)
    }
    Object.defineProperty(obj, key, {
        get(){
            console.log('get', key)
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
            }
        }
    })
}


function observe(obj){
    if(typeof obj !== 'object'||obj==null){
        return obj
    }
    Object.keys(obj).forEach(key=>{
        defineReactive(obj, key, obj[key])
    })
}

function set(obj, key, value){
    defineReactive(obj, key, value)
}
