/*
 * @Author: zy9@github.com/zy410419243 
 * @Date: 2018-04-24 15:33:50 
 * @Last Modified by: zy9
 * @Last Modified time: 2018-04-25 16:51:34
 */
import { Vector2, Vector3,  AmbientLight, Mesh, Raycaster, BoxHelper, Box3, Line, PerspectiveCamera, WebGLRenderer, Scene, Group, Geometry, TextureLoader, Object3D, CanvasTexture } from 'three'
import MTLLoader from '../third/three/loader/MTLLoader'
import OBJLoader from '../third/three/loader/OBJLoader'
import OrbitControls from 'three-orbitcontrols'
import TWEEN from 'tween'
import extend from '../util/DeepClone'

export default class Trunk {
    // 默认配置
    config = {
        // clear_color: 0x4584b4, // 画布颜色
        clear_opacity: 0.2, // 画布透明度
        mesh_shift_time: () => Math.random() * 1000 * 5 + 1000, // 板块移动时间
        before_init: null, // 初始化前的钩子
        border_visible: true, // 边界是否显示
        divisor: 12000, // 控制柱子高度，该数越大，柱子越矮
        texture: {
            line: '#055290', // 内部乡镇边界贴图
            pillar: '#2377e8', // 柱子贴图
            top: '#07205b', // 上表面贴图
            bottom: '#000', // 底部贴图
            border: '#2a8fdf', // 边缘边界贴图
            select: '#071C5B', // 鼠标移入时贴图
        },
        light: () => { // x轴正方向是屏幕右边，y轴正方向是屏幕里边，z轴正方向是屏幕上边
            let lights = [];

            let ambientLight = new AmbientLight('white');
            lights.push(ambientLight)

            return lights;
        },
        clientWidth: document.documentElement.clientWidth || document.body.clientWidth,
        clientHeight: document.documentElement.clientHeight || document.body.clientHeight
    };

    _startPositions = {};
    _startTweenCount = 0;
    // 柱子高度变化的定时器
    _intervals = {};
    // 鼠标移入板块高亮
    _old = {};
    _current = {};
    /* 
        渲染模型容器,相当于对div进行appendChild
        这里具体干的是往scene里加Object3D，然后所有模型都放在Object3D对象里
        原因是scene上不能直接渲染Mesh啊Group之类的对象，需要这么个载体
    */
    root = {};
    // 标识模型是否移动过
    _withdrawPosition = false;
    // 处理模型移动的方法
    _meshTween = null;
    
    // 模型数据
    dataObject = {};
    
    // 多次用到容器节点，存到全局变量里方便调用
    container = {};

    // 整个模块的贴图，用作等值面
    model_texture = {};

    // 初始化three渲染三要素
    camera = null;
    renderer = null;
    scene = null;

    // 初始化开场动画前板块位置
    _initAreaPosition = (area, child) => {
        let { _startPositions } = this;

        let p = _startPositions[area];
        if(!p) {
            p = {
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                z: Math.random() > 0.5 ? (Math.random() * 200 + 300) : (-Math.random() * 500 - 1000)
            };
            _startPositions[area] = p;
        }
        child.position.set(p.x, p.y, p.z);
    }

    // 处理开场动画参数
    _dealObjectInLoadCirculStart = (child, visible) => {
        if(!child.name) {
            return;
        }
        // 设置上下边界是否显示
        if(/border$/.test(child.name)) {
            child.visible = visible;
        }

        if(child instanceof Mesh) {
            let area = child.name.split('_')[0];
            this._initAreaPosition(area, child);
        }
    }

    /**
     * 处理柱子渲染
     * @param child 当前遍历模型对象
     * @param divisor 计算柱子高度，柱子高度 = 当前模型中数据 / divisor * 15，也就是说divisor越小，柱子越高
    */
    _changeModel4DataRefresh = (child, divisor) => {
        let name = child.name;
        
        if(/pillar$/.test(name)) {
            let dmName = name.split('_')[0];
            let data = child.userData.val;
            if(dmName) {
                let height = 0;
                let proportion = 0;

                if(divisor && 0 !== divisor) {
                    proportion = data / divisor;
                    height = proportion * 15;
                }

                // 不支持负数，但万一传了负数，暂按0处理
                if(height <= 0) {
                    child.visible = false;
                } else {
                    this._setHeightSlow(child, height);
                    child.visible = true;
                }
            } else {
                dmName = name ? name.split('_')[0] : '';
                // TODO 与上面height <= 0重复，代码需精简
                child.visible = false;
            }
        }
    };
    
    /**
     * 设置柱子高度（缓慢变高，高度从1开始变到指定高度）
     * 这个方法不要加太多逻辑，这里我试着在循环里console.log，渣电脑甚至能掉帧
     * @param child
     * @param height
     * @private
     */
    _setHeightSlow = (child, height) => {
        this._setHeight(child, 1);
        let i = 1;
        let sh;
        // 柱子高度上升速度
        let times = 300;

        const show = () => {
            if(i < times) {
                let h = Math.floor(height * i / times);
                this._setHeight(child, h);
                i++;
            } else if(i === times) {
                i++;
                this._setHeight(child, height);
            } else {
                clearInterval(sh);
                delete this._intervals[sh];
            }
        }

        sh = setInterval(show, function() {});
        this._intervals[sh] = sh;
    };
    
    /**
     * 设置柱子高度
     * 这个方法不要加太多逻辑，这里我试着在循环里console.log，渣电脑甚至能掉帧
     * @param child
     * @param height
     * @private
     */
    _setHeight = (child, height) => {
        if(height === 0 || isNaN(height)) {
            // 不能高度设置为0，否则下一次设置的时候会出问题，
            height = 1;
        }
        let geometry = child.geometry;

        geometry.verticesNeedUpdate = true;

        let vertices = geometry.vertices;

        /* 
            此处应该当有掌声，当然可能是写的人的特有感慨
            这里区分了顶面和底面的点，前提是给的模型数据里的柱子高度不能为0

            下面这段代码看上去简单，但领悟到顶面和底面不能在同一个面上,否则就区分不出的痛整整花了一天时间

            这里先区分z，不是特别花俏的柱子一般只有六个面八个点两种z
            然后底面的z不变，顶面的z加高度
        */
        let minz = vertices[0].z;
        for (let vertice of vertices) {
            let z = vertice.z;
            if(minz != z) {
                minz = Math.min(z, minz);
                break;
            }
        }
        for (let vertice of vertices) {
            if(vertice.z !== minz) {
                vertice.z = minz + height;
            }
        }
    };

    // 实时渲染
    _flush = () => {
        const render = () => {
            requestAnimationFrame(render);
            TWEEN.update();
            this.renderer.render(this.scene, this.camera);
        }
        render();
    }
    
    /**
     * 事件绑定
     * @private
     * @param config 模型配置文件
     * @param object .obj文件，所有模型数据。这里得注意跟child的区别，变量名写惯了都是object..
     */
    _initListener = object => {
        this.container.addEventListener('mousemove', e => this._setMeshHighLightStatus(e), false);

        this.container.addEventListener('click', e => this._showDetail(e, object), false);
    };
    
    /* 
        改变板块的高亮状态

        鼠标移上去，如果是板块，那改变该板块材质中的颜色
        移开后恢复原来的材质
        得注意边界线也是种模型，需要额外判断
    */
    _setMeshHighLightStatus = event => {
        const { config } = this;
        let intersected = this._objectFromMouse(event.pageX, event.pageY);
        let child = intersected.object;

        let texture = config.texture;

        // 设置/移除高亮
        if(child) {
            let uuid = this._current && this._current.uuid;
            if(uuid === child.uuid) {
                return;
            } else {
                if(!/border$/.test(child.name) && !/Line$/.test(child.name) && !/pillar$/.test(child.name) && !/area$/.test(child.name)) {
                    if(!uuid) { // 第一次
                        this._current = child;
                        
                        // 鼠标移入设置移入的颜色
                        child.material.color.set(texture.select);
                    } else {
                        // 鼠标移开设置原先表面的颜色
                        this._current.material.color.set(texture.top);
                            
                        this._old = this._current;
                        this._current = child;

                        // 鼠标移入设置移入的颜色
                        child.material.color.set(texture.select);
                    }
                }
            }
        }
    }

    // 点击板块，板块左移，右边空出来的地方显示表格
    _showDetail = (event, object) => {
        const { config } = this;
        event.preventDefault();

        let intersected = this._objectFromMouse(event.pageX, event.pageY);
        let child = intersected.object;

        if(child) {
            // 右侧表格数据的显示
            if(config.show_detail) {
                let flag = config.show_detail(child);
                this._meshMove(!!flag, object);
            }
        }
    }

    // 获得鼠标位置的板块模型对象
    _objectFromMouse = (pagex, pagey) => {
        let { container } = this;
        let { offsetLeft, offsetTop } = this.renderer.domElement;

        let eltx = pagex - offsetLeft;
        let elty = pagey - offsetTop;

        let vpx = (eltx / container.offsetWidth) * 2 - 1;
        let vpy = -(elty / container.offsetHeight) * 2 + 1;
        let vector = new Vector2(vpx, vpy);
        let raycaster = new Raycaster();

        raycaster.setFromCamera(vector, this.camera);

        let intersects = raycaster.intersectObjects(this.root.children, true);

        if(intersects.length > 0) {
            let intersect = intersects[0];
            if(intersect) {
                return intersect;
            }
        }

        return { object: null, point: null, face: null };
    }

    // 获得元素相对整个页面的偏移量
    _getOffset = (node, offset) => {
        if(!offset) {
            offset = {};
            offset.top = 0;
            offset.left = 0;
        }

        if(node == document.body) { // 当该节点为body节点时，结束递归
            return offset;
        }

        offset.top += node.offsetTop;
        offset.left += node.offsetLeft;

        return this._getOffset(node.parentNode, offset); // 向上累加offset里的值
    }

    /**
     * 整个模型漂移
     * 如果withdraw为true，表示需要把模型移开，即从中心点向左移
     *
     * 如果withdraw为false，表示需要还原至中心
     * @param withdraw 是否移开
     * @private
     */
    _meshMove = (withdraw, object) => {
        let { camera, renderer, container } = this;
        let point = { x: 0, y: 0, z: 0 };
        let rotation = { x: -Math.PI / 4, y: 0, z: 0 };

        if(withdraw) {
            rotation = { x: -Math.PI / 4, y: Math.PI / 180 * 10, z: 0 };
            
            // 默认配比是500 * 300的设置
            let gap = container.clientWidth / 550;
            // 算移开的位置，移开的位置是固定的，只算一遍
            if(!this._withdrawPosition) {
                this._withdrawPosition = this._getCoordinate2InScene({
                    x: 30 * gap,
                    y: renderer.domElement.offsetHeight / 2
                }, camera, renderer.domElement);

                // x 的位置需要加上模型长的一半，避免飞出
                this._withdrawPosition.x += this.getMeshWidth(object).length / 2;
            }
            point = this._withdrawPosition;
        }

        if(this._meshTween) {
            TWEEN.remove(this._meshTween);
            this._meshTween = null;
        }
        this._meshTween = this._tweenInOut(object.position, { x: point.x, y: 0, z: 0 }, 1000);
    };
    
    // 获得模型宽度
    getMeshWidth = object => {
        let c = 16711680, length = 0, width = 0, height = 0;
        let boxHelper = new BoxHelper(object, c);
        let box = new Box3().setFromObject(object);

        boxHelper.update();

        length = box.max.x - box.min.x;
        width = box.max.y - box.min.y;
        height = box.max.z - box.min.z;

        return { length, width, height };
    }

    // 定义各板块移动速度
    _handle_model_shift = child => {
        let { _startPositions, config } = this;

        let name = child.name.split('_');
        let last_name = name[name.length - 1];
        let area = name[0];
        
        if(!_startPositions[area]) {
            return;
        }

        return config.mesh_shift_time && config.mesh_shift_time();
    }

    /**
     * 遍历所有模型对象时的回调 
     * @param {*} child 当前遍历模型
     */
    child_mapping = child => {
        let { config } = this;

        if(config.child_mapping) {
            config.child_mapping(child);

            return;
        }
        if(child instanceof Mesh || child instanceof Line) {
            let name = child.name.split('_');
            let last_name = name[name.length - 1];

            let texture = config.texture;

            // 改变模型贴图
            switch(last_name) {
                case 'Line': // 内部乡镇边界贴图
                    child.material.color.set(texture.line);
                break;

                case 'pillar': // 柱子贴图
                    child.material.color.set(texture.pillar);
                    // child.material.map = new TextureLoader().load('../assets/texture/crate.jpg');
                break;

                case 'bottom': // 底面贴图
                    child.material.color.set(texture.bottom);
                break;

                case 'border': // 边缘边界贴图
                    child.material.color.set(texture.border);
                break;

                default: // 顶面贴图
                    child.material.color.set(texture.top);
                break;
            }
        }
    }

    // 计算模型移动距离
    _getCoordinate2InScene = (i, d, c) => {
        d.updateMatrixWorld(true);

        let b = this.getVector2InScene(i, c);
        let j = new Vector3(b.x, b.y, 0);

        j.unproject(d);
        j.sub(d.position);
        j.normalize();

        let f = new Raycaster(d.position, j);
        let h = f.ray.origin;
        let g = f.ray.direction;
        let e = 0;
        let a = new Vector3();

        a.setX(h.x - ((h.z - e) * g.x / g.z));
        a.setY(h.y - ((h.z - e) * g.y / g.z));
        
        return a;
    }

    getVector2InScene = (a, c) => {
        let b = new Vector2();
        b.x = (a.x / c.offsetWidth) * 2 - 1;
        b.y = -(a.y / c.offsetHeight) * 2 + 1;

        return b;
    };

    /**
     * TWEEN动画，封装一下调用的时候写简单点
     * @param a 起点
     * @param b 终点
     * @param t 过渡时间
     * @param c 动画加载完成回调
     * @param s 动画开始回调
     */
    _tweenInOut = (a, b, t, c, s) => {
        let tween = new TWEEN.Tween(a)
            .to(b, t)
            .easing(TWEEN.Easing.Exponential.InOut);

        c && tween.onComplete(c);
        s && tween.onStart(s);

        return tween.start();
    };

    /**
     * 递归加载、合并多个材质文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.materials，数组
     * @param {*} loader 文件加载器
     * @param {*} material 加载完成后的材质对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回材质对象
     */
    _load_materials = (paths, loader, material, callback) => {
        loader.load(paths[0], materials => {
            material ? material.materialsInfo = [...material.materialsInfo, ...materials.materialsInfo] : material = materials;

            paths.shift();

            paths.length != 0 ? _load_materials(paths, loader, material, callback) : callback(material);
        });
    }

    /**
     * 递归加载、合并多个模型文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.objects，数组
     * @param {*} loader 文件加载器
     * @param {*} object 加载完成后的模型对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回模型对象
     */
    _load_objects = (paths, loader, object, callback) => {
        loader.load(paths[0], objects => {
            object ? object.children = objects.children.concat(object.children) : object = extend({}, objects);

            paths.shift();

            paths.length != 0 ? _load_objects(paths, loader, object, callback) : callback(object);
        });
    }

    /**
     * 初始化参数
    */
    _init_params = () => {
        const { config } = this;
        const { clientWidth, clientHeight } = config;

        // 挂载画布的dom
        this.container = config.container;

        // 相机视锥体的长宽比
        const _camera_aspect = clientWidth / clientHeight;
        this.camera = new PerspectiveCamera(45, _camera_aspect, 1, 10000);
        this.camera.position.z = 100;
        
        // 设置画布透明
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(clientWidth, clientHeight - 4);

        this.container.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.add(this.camera);

        // 初始化轨道控制
        let controls = new OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(controls, config.controls);

        // 初始化光线
        if(config.light) {
            let lights = config.light();
            for(let light of lights) {
                this.scene.add(light)
            }
        }
     
        // 设置背景颜色
        config.clear_color && renderer.setClearColor(config.clear_color, config.clear_opacity);
    }

    /**
     * 完成开场动画后，相机视角变动
     * 一种是旋转mesh，一种是改变相机位置
     * 这是旋转mesh
     */
    _afterMovementMesh = () => {
        // 视角转动速度
        let speed = 0.02;

        const rotateAnimate = () => {
            requestAnimationFrame(rotateAnimate);
            
            // y轴正半轴朝上，这方法用作除抖
            // root.position.y <= 0 ? root.position.y += 0.8 : null;
            // 沿x轴旋转
            this.root.rotation.x >= -Math.PI / 4 ? this.root.rotation.x -= speed : null;
            this.renderer.render(this.scene, this.camera);
        };

        rotateAnimate();
    }

    /**
     * 预处理模型数据
     * @param object 模型数据
    */
    _handle_mesh = object => {
        let { config, _startTweenCount } = this;

        object.traverse(child => {
            if(child instanceof Group) {
                return;
            }
            if(child instanceof Mesh) {
                child.geometry = new Geometry().fromBufferGeometry(child.geometry);
            } else if(child instanceof Line) {
                console.log(child.name)
            }

            child.name == 'texture' && (this.model_texture = child);
            
            this._dealObjectInLoadCirculStart(child, config.border_visible);

            this.child_mapping(child, config);

            let time = this._handle_model_shift(child, config);

            // 开始动画
            this._tweenInOut(child.position, { x: 0, y: 0, z: 0 }, time, () => {
                _startTweenCount--;
                if(_startTweenCount === 0) {
                    this.render_pillar(object);
                    this._afterMovementMesh();

                    // 绑定事件，比如鼠标移到板块上高亮
                    this._initListener(object);
                }
            });
            _startTweenCount++;
        });
    }

    /**
     * 显示贴图
     * @param material 传入的材质，最后和原材质中的属性合并
     * @param url 等值面图片地址
    */
    show_texture = (material, url) => {
        if(url) {
            new TextureLoader().load(url, map => {
                this.model_texture.material.map = map;
            });
        }

        this.model_texture.material = Object.assign(this.model_texture.material, material);
        this.model_texture.visible = !this.model_texture.visible;
    }

    get_object = () => this.dataObject;

    /**
     * 更新数据并刷新柱子高度，也就是动画重播一遍
     * TODO 根据传入对象判断哪些对象需要更新
     * @param {*} object 新的模型对象
     */
    refresh_pillar = object => {
        let { dataObject } = this;

        dataObject = object;
        this.render_pillar(dataObject);
    }

    // 渲染柱子
    render_pillar = object => {
        const { config } = this;

        object.traverse(child => {
            this._changeModel4DataRefresh(child, config.divisor);
        });
    }

    init = _config => {
        let { config } = this;
        // TODO 去掉加载材质和模型方法的副作用
        config = extend(this.config, _config);
        
        this._init_params(_config);
        
        // 初始化前的钩子
        config.before_init && config.before_init(config);
        
        // 加载模型数据
        let mtlLoader = new MTLLoader();

        this._load_materials(config.data.materials, mtlLoader, null, materials => {
            config.set_material && (materials = config.set_material(materials));
            
            let objLoader = new OBJLoader();
            objLoader.setMaterials(materials);

            this._load_objects(config.data.objects, objLoader, null, object => {
                config.data.load(object, new_object => {
                    this.dataObject = new_object;

                    this._handle_mesh(new_object);

                    this.root = new Object3D().add(new_object);
                    this.scene.add(this.root);
                    
                    this._flush();
                });
            })
        });
    };
}