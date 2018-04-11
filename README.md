# three-demo-simple
- 重写自[这里](https://github.com/zy410419243/three-demo)  
  
- 文件引入用的require.js，至少调试的时候不会像老版那样伤眼  
  
- three升级至r91dev，api跟官方文档能对上了
  
# 怎么看demo
  clone下来，部署到本地服务器，打开index.html即可  
    
  比如我发布到IIS上，端口9005，最后在地址栏输入 http://locahost:9005 即可（IIS默认打开文件index.html） 
    
  用法也在demo里，因为代码挺长就不贴了

## 效果图
![img](./gif/demo.gif)  
电脑渣，录的很卡，德芙版请部署到本地

# API
## Trunk.init()
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| container | 挂载画布的节点 | dom | 无 |
| divisor | 用于控制柱子高度，算法：柱子高度 = 当前模型中数据 / divisor * 15，也就是说divisor越小，柱子越高。一般是传数据中的最大值 | String或Number | 无 |
| clear_color | 颜色字符串，hex、十六进制都行，不传就是黑的 | String | 无 |
| top_border_visible | 是否显示上边界 | Boolean | false |
| bottom_border_visible | 是否显示下边界 | Boolean | false |
| top_border_prefix | 模型文件中边界名称，这个名称得去obj文件中找 | String | 无 |
| mesh_shift_time | 定义各板块移动时间，单位毫秒 | Number | 2000 |
| texture | 模型贴图，具体参数见下 | {} | 无 |
| light | 初始化光线，需要手动return光线实例数组 | Function， () => {} | 无 |
| data | 加载模型及业务数据，具体参数见下 | {} | 无 |
| show_table | 点击板块后显示在右侧的表格，这玩意完全开放，需要什么样式自己操作dom。没这个方法点击板块是没反应的 | Function， (child) => {} | 无 |
| controls | 轨道控制参数。想看中文文档就去搜一下OrbitControls，直接一点就看./third/three/controls/OrbitControls | {} | 无 |

## texture
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| line | 内部乡镇边界贴图 | String | 无 |
| pillar | 柱子贴图 | String | 无 |
| bottom | 底部贴图 | String | 无 |
| top | 上表面贴图 | String | 无 |
| select | 鼠标移入时贴图 | String | 无 |
* 注：这里的值都是颜色字符串，hex、十六进制都行，不传就是黑的。

## data
| 参数 | 说明 | 类型 | 默认值 |
| :------: | ----- | :------: | :------: |
| materials | 材质文件路径 | String | 无 |
| objects | 模型文件路径 | String | 无 |
| business | 业务数据接口地址 | String | 无 |
| business_callback | 请求业务数据后的回调。result是业务数据，object是模型数据。如果需要显示表格，则需要给模型对象的userData赋值 | (result, object) => {} | 无 |

# License MIT