# three-kit
- three.js的一实现封装
  
# 用法
* 跑在webpack-dev-server上
``` bash
  npm install

  npm start

  在地址栏输入http://localhost:9099
```

* 打包成umd  
npm run build，需要自行引入three.js

* 用法
``` javascript
  import Trunk from '../dist/Trunk'

  ComponentDidMount = () => {
    const trunk = new Trunk(config);

    trunk.init();
  }
```

## 效果图
![img](./gif/demo.gif)  
电脑渣，录的很卡，德芙版请部署到本地

# API

## Trunk对象上绑定的方法
| 名称 | 说明 | 用法 |
| :------: | ----- | :------: |
| init | 初始化方法， | Trunk.init() |
| getObject | 获得最新模型数据集 | Trunk.getObject() |
| refreshPillar | 重新请求数据并刷新柱子, 需传入新的模型数据.  TODO 指定某对象刷新数据和模型 | Trunk.refreshPillar(object) |
| showTexture | 设置等值面模型材质和贴图, 具体用法见下 | Trunk.showTexture(config, url) |

## Trunk.showTexture(config, url)
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| config | 控制等值面是否显示，visible可以不用传，其它属性和mesh.material中的属性对应，形如{ transparent: true, opacity: 0.5 } | {} | 无 |
| url | 等值面图的地址 | string | 无 |

## Trunk.init中config说明
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| container | 挂载画布的节点 | dom | 无 |
| divisor | 用于控制柱子高度，算法：柱子高度 = 当前模型中数据 / divisor * 15，也就是说divisor越小，柱子越高。一般是传数据中的最大值 | string或Number | 无 |
| clearColor | 画布颜色。颜色字符串，hex、十六进制都行 | string | transparent |
| clearOpacity | 画布透明度 | Float, [0, 1] | 0.2 |
| borderVisible | 是否显示上下边界 | Boolean | false |
| meshShiftTime | 定义各板块移动时间，单位毫秒 | Number | 2000 |
| texture | 设置鼠标移入、移出板块颜色变化 | {} | 无 |
| childMapping | 手动设置模型贴图，可以理解为遍历模型数据时的回调 | Function, (child, config) => {} | 无 |
| light | 初始化光线，需要手动return光线实例数组 | Function, () => { return []; } | 白色环境光 |
| showDetail | 这方法主要是把点击的模型传出来，具体要做什么自己写，没这个方法点击板块是没反应的。返回值控制模型是否移动 | child => { return Boolean } | 无 |
| controls | 轨道控制参数。相关参数搜一下OrbitControls | {} | { maxPolarAngle: Math.PI * 0.75, minPolarAngle: Math.PI * 0.25, } |
| data | 加载模型及业务数据，具体参数见下 | {} | 无 |
| clientWidth | 画布宽度 | Number | document.body.clientWidth |
| clientHeight | 画布高度 | Number | document.body.clientHeight |
| cameraPosition | 相机初始位置 | {} | { x: 0, y: 0, z: 65 } |
| rotationSpeed | 开场动画结束后，视角旋转的速度 | Float | 0.02 |
* 关于画布，默认是透明的，也就是白的。要改变背景颜色，一种是给clear_color和clear_opacity赋值，另一种是修改容器的background

## Trunk.init(config) -> config.hooks
| 参数 | 说明 | 类型 |
| :------: | ----- | :------: |
| beforeInit | 在加载模型之前、初始化参数之后的钩子，传出于默认值合并后的config | Function, (config) => {}  |
| setMaterial | 加载材料后、加载模型前的钩子，用于处理等值面之类的贴图，不预先处理的话，texture.map.image的尺寸没法确定。传出合并后的材料对象 | Function, (materials) => { return materials; }  |
| data.load | 勉强算是钩子，在加载材质和模型之后，在渲染之前，毕竟数据还没处理。本来写在类内，但想想数据处理太复杂就丢出来了。具体data中的参数 | Function, (object, goon) |
| beforeAnimate | 作用于板块初始化位置时，及开场动画结束，也就是板块移动结束时。用于控制开场动画中的边界及柱子 | Function, child => {} |

## Trunk.init(config) -> config.texture
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| line | 内部乡镇边界贴图 | string | 无 |
| pillar | 柱子贴图 | string | 无 |
| border | 边缘边界贴图 | string | 无 |
| top | 顶面贴图 | string | 无 |
| bottom | 底面贴图 | string | 无 |
| select | 鼠标移入时，整个板块贴图 | string | 无 |
* 这里的值都是颜色字符串，hex、十六进制都行，不传就是黑的。

## Trunk.init(config) -> config.data
| 参数 | 说明 | 类型 |
| :------: | ----- | :------: |
| materials | 材质文件路径，形如['./data/model/deqing04.mtl', './data/model/zhengti.mtl']，暂时只支持数组 | Array |
| objects | 模型文件路径，形如['./data/model/deqing04.obj', './data/model/zhengti.obj']，暂时只支持数组 | Array |
| load | 初次加载数据时执行的方法，object是合并后的模型对象，goon是处理完数据（使模型和业务数据对应）后需要执行的方法，执行完后得把新的模型数据传进去，形如goon(new_object) | Function, (object, goon) |

# 模型数据说明
假设模型的区域是浙江省，板块名字叫hangzhou
* 板块是杭州市这一块所在的区域，然后宁波也算个板块，这么多板块拼成的东西叫模型，模型内部及板块内部用line区分边界，模型外部用_border区分边界
* hangzhou是板块顶面的数据
* hangzhou_bottom是板块底面的数据
* line是杭州市下乡镇边界，目前的边界数据是所有乡镇边界都放一起的
* top_border是模型顶面边界，bottom_border是模型底面边界  
* hangzhou_pillar是板块中心的柱子
* texture用来贴等值面，实际上就是原先的模型复制一下轮廓
* area是柱子底下的圆
* 换句话说，obj文件里的名字只能是line、top_border、bottom_border、hangzhou 、hangzhou_bottom、hangzhou_pillar、texture、hangzhou_area，别的咱不管
  
嚷嚷这么多东西，其实用到的可能就只有改变材质的时候会用到这些概念，不懂是完全没问题的

# License MIT
